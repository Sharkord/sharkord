import {
  ChannelPermission,
  Permission,
  ServerEvents,
  StreamKind,
  type TStreamQualityLayer
} from '@sharkord/shared';
import { createHash, randomUUID, timingSafeEqual } from 'crypto';
import http from 'http';
import { config } from '../../config';
import { channelUserCan } from '../../db/queries/channels';
import { userCan } from '../../db/queries/roles';
import { getUserByToken } from '../../db/queries/users';
import { logger } from '../../logger';
import { VoiceRuntime } from '../../runtimes/voice';
import { pubsub } from '../../utils/pubsub';
import { createRateLimiter } from '../../utils/rate-limiters/rate-limiter';
import { enforceHttpRateLimit, getTextBody, sendJsonError } from '../helpers';
import {
  buildWhipAnswer,
  parseIceFragment,
  parseWhipOffer,
  WhipSdpError
} from './sdp';
import { closeWhipSession, whipSessions } from './sessions';

const whipRateLimiter = createRateLimiter({
  maxRequests: config.rateLimiters.whip.maxRequests,
  windowMs: config.rateLimiters.whip.windowMs
});

// a session started with the global key publishes as an anonymous external
// stream (OBS and other encoders), while a session started with a user token
// publishes as that user's own screen share with the exact same semantics as
// the browser's mediasoup-client path
type TWhipAuth = { type: 'key' } | { type: 'user'; userId: number };

const tokenMatchesGlobalKey = (token: string) => {
  const key = config.whip.key;

  if (!key) return false;

  const tokenDigest = createHash('sha256').update(token).digest();
  const keyDigest = createHash('sha256').update(key).digest();

  return timingSafeEqual(tokenDigest, keyDigest);
};

const resolveWhipAuth = async (
  req: http.IncomingMessage
): Promise<TWhipAuth | undefined> => {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) return undefined;

  const token = header.slice('Bearer '.length);

  if (tokenMatchesGlobalKey(token)) {
    return { type: 'key' };
  }

  const user = await getUserByToken(token);

  return user ? { type: 'user', userId: user.id } : undefined;
};

const sendUnauthorized = (res: http.ServerResponse) => {
  res.setHeader('WWW-Authenticate', 'Bearer');
  sendJsonError(res, 401, 'Invalid or missing WHIP bearer token');
};

// the media type is optional to stay lenient with encoder implementations,
// but anything other than application/sdp is rejected
const hasUnsupportedContentType = (
  req: http.IncomingMessage,
  expected: string
) => {
  const contentType = req.headers['content-type'];

  if (!contentType) return false;

  return (contentType.split(';')[0] ?? '').trim().toLowerCase() !== expected;
};

// /whip/<channelId> for POST, /whip/<channelId>/<sessionId> for the rest
const getWhipPathSegments = (pathname: string) => {
  const segments = pathname.split('/').filter(Boolean);

  if (segments[0] !== 'whip') return undefined;

  const channelId = Number(segments[1]);

  if (!Number.isInteger(channelId) || channelId <= 0) return undefined;

  return {
    channelId,
    sessionId: segments[2]
  };
};

// simulcast producers need a quality layer per encoding. labels follow the
// position after the low-first ordering, matching what the mediasoup-client
// path reports so viewers always see the familiar Low/Medium/High
const getSimulcastQualityLayers = (producer: {
  type: string;
  rtpParameters: { encodings?: unknown[] };
}): TStreamQualityLayer[] | undefined => {
  if (producer.type !== 'simulcast') return undefined;

  const layerCount = producer.rtpParameters.encodings?.length ?? 0;

  return (producer.rtpParameters.encodings ?? []).map((_, index) => ({
    spatialLayer: index,
    label: index === 0 ? 'Low' : index === layerCount - 1 ? 'High' : 'Medium'
  }));
};

const registerUserScreenShare = (
  runtime: VoiceRuntime,
  channelId: number,
  userId: number,
  producers: {
    video?: { type: string; rtpParameters: { encodings?: { rid?: string }[] } };
    audio?: unknown;
  }
) => {
  if (producers.video) {
    runtime.addProducer(
      userId,
      StreamKind.SCREEN,
      producers.video as Parameters<VoiceRuntime['addProducer']>[2],
      getSimulcastQualityLayers(producers.video)
    );

    pubsub.publishForChannel(channelId, ServerEvents.VOICE_NEW_PRODUCER, {
      channelId,
      remoteId: userId,
      kind: StreamKind.SCREEN
    });
  }

  if (producers.audio) {
    runtime.addProducer(
      userId,
      StreamKind.SCREEN_AUDIO,
      producers.audio as Parameters<VoiceRuntime['addProducer']>[2]
    );

    pubsub.publishForChannel(channelId, ServerEvents.VOICE_NEW_PRODUCER, {
      channelId,
      remoteId: userId,
      kind: StreamKind.SCREEN_AUDIO
    });
  }
};

const handleWhipPost = async (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  channelId: number,
  auth: TWhipAuth
) => {
  const body = await getTextBody(req);

  if (!body) {
    sendJsonError(res, 400, 'Missing SDP offer body');
    return;
  }

  const runtime = VoiceRuntime.findById(channelId);

  if (!runtime) {
    sendJsonError(res, 404, 'Voice channel not found');
    return;
  }

  if (auth.type === 'user') {
    // mirrors the permission gates of the tRPC produce route
    const [canShareInChannel, canShareOnServer] = await Promise.all([
      channelUserCan(channelId, auth.userId, ChannelPermission.SHARE_SCREEN),
      userCan(auth.userId, Permission.SHARE_SCREEN)
    ]);

    if (!canShareInChannel || !canShareOnServer) {
      sendJsonError(
        res,
        403,
        'You do not have permission to share your screen in this channel'
      );
      return;
    }
  }

  let router;

  try {
    router = runtime.getRouter();
  } catch {
    sendJsonError(res, 503, 'Voice channel is not ready yet');
    return;
  }

  const { transport, params } = await runtime.createTransport();

  try {
    const parsedMedias = parseWhipOffer(body, router);
    const primaryMedia = parsedMedias[0];

    if (!primaryMedia) {
      throw new WhipSdpError('offer contains no media section');
    }

    // all m-lines of a WHIP offer share the same transport, so the first
    // media section decides the DTLS role and fingerprint for the connect()
    await transport.connect({
      dtlsParameters: {
        role: primaryMedia.remoteDtlsRole,
        fingerprints: [
          {
            algorithm: primaryMedia.remoteFingerprint.algorithm,
            value: primaryMedia.remoteFingerprint.value
          }
        ]
      }
    });

    let audioProducer;
    let videoProducer;

    for (const media of parsedMedias) {
      const producer = await transport.produce({
        kind: media.kind,
        rtpParameters: media.rtpParameters,
        appData: {
          kind:
            media.kind === 'audio'
              ? StreamKind.EXTERNAL_AUDIO
              : StreamKind.EXTERNAL_VIDEO,
          ...(auth.type === 'user' ? { userId: auth.userId } : {}),
          source: 'whip'
        }
      });

      if (media.kind === 'audio') {
        audioProducer = producer;
      } else {
        videoProducer = producer;
      }
    }

    const sessionId = randomUUID();

    if (auth.type === 'user') {
      // the stream shows up exactly like a mediasoup-client screen share:
      // the user's own SCREEN/SCREEN_AUDIO producers, so every client
      // consumes it with zero extra signaling
      registerUserScreenShare(runtime, channelId, auth.userId, {
        video: videoProducer,
        audio: audioProducer
      });
    } else {
      const streamId = runtime.createExternalStream({
        title: 'WHIP Ingest',
        key: `whip-${sessionId}`,
        pluginId: 'whip',
        producers: { audio: audioProducer, video: videoProducer },
        videoLayers: videoProducer
          ? getSimulcastQualityLayers(videoProducer)
          : undefined
      });

      const stream = runtime.getState().externalStreams[streamId]!;

      pubsub.publish(ServerEvents.VOICE_ADD_EXTERNAL_STREAM, {
        channelId,
        streamId,
        stream
      });

      if (audioProducer) {
        pubsub.publishForChannel(channelId, ServerEvents.VOICE_NEW_PRODUCER, {
          channelId,
          remoteId: streamId,
          kind: StreamKind.EXTERNAL_AUDIO
        });
      }

      if (videoProducer) {
        pubsub.publishForChannel(channelId, ServerEvents.VOICE_NEW_PRODUCER, {
          channelId,
          remoteId: streamId,
          kind: StreamKind.EXTERNAL_VIDEO
        });
      }
    }

    const session = {
      id: sessionId,
      channelId,
      userId: auth.type === 'user' ? auth.userId : undefined,
      transport,
      remoteIceUfrag: primaryMedia.remoteIceUfrag,
      createdAt: Date.now()
    };

    whipSessions.set(sessionId, session);

    transport.on('icestatechange', (state) => {
      if (state === 'disconnected' || state === 'closed') {
        logger.debug(`[WHIP] ICE ${state} on session ${sessionId}, closing`);
        closeWhipSession(sessionId);
      }
    });

    transport.on('dtlsstatechange', (state) => {
      if (state === 'failed' || state === 'closed') {
        logger.debug(`[WHIP] DTLS ${state} on session ${sessionId}, closing`);
        closeWhipSession(sessionId);
      }
    });

    const answerSdp = buildWhipAnswer(parsedMedias, params);

    logger.debug(
      `[WHIP] Session ${sessionId} created on channel ${channelId} (%s, tracks: audio=${!!audioProducer}, video=${!!videoProducer})`,
      auth.type === 'user' ? `user ${auth.userId}` : 'global key'
    );

    res.writeHead(201, {
      'Content-Type': 'application/sdp',
      Location: `/whip/${channelId}/${sessionId}`,
      'Cache-Control': 'no-store'
    });
    res.end(answerSdp);
  } catch (error) {
    transport.close();

    if (error instanceof WhipSdpError) {
      sendJsonError(res, 400, error.message);
      return;
    }

    logger.error('[WHIP] failed to negotiate session: %s', error);
    sendJsonError(res, 400, 'Could not negotiate the WHIP session');
  }
};

const handleWhipPatch = async (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  channelId: number,
  sessionId: string | undefined
) => {
  const body = await getTextBody(req);
  const session = sessionId ? whipSessions.get(sessionId) : undefined;

  if (!session || session.channelId !== channelId) {
    sendJsonError(res, 404, 'WHIP session not found');
    return;
  }

  const fragment = parseIceFragment(body);

  // mediasoup learns the remote address from inbound ICE binding requests,
  // so remote candidates are not applied, but an ice-ufrag change signals an
  // ICE restart which mediasoup WebRtcTransport does not support
  if (fragment.ufrag && fragment.ufrag !== session.remoteIceUfrag) {
    sendJsonError(res, 400, 'ICE restart is not supported');
    return;
  }

  if (fragment.candidates.length) {
    logger.debug(
      `[WHIP] ignoring %d trickled candidate(s) on session ${sessionId}`,
      fragment.candidates.length
    );
  }

  res.writeHead(204);
  res.end();
};

const handleWhipDelete = (
  res: http.ServerResponse,
  channelId: number,
  sessionId: string | undefined
) => {
  const session = sessionId ? whipSessions.get(sessionId) : undefined;

  if (!session || session.channelId !== channelId) {
    sendJsonError(res, 404, 'WHIP session not found');
    return;
  }

  closeWhipSession(session.id);

  logger.debug(`[WHIP] Session ${session.id} deleted`);

  res.writeHead(204);
  res.end();
};

const whipRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  ctx: { info?: { ip?: string }; pathname: string }
) => {
  if (!config.whip.enabled) {
    sendJsonError(res, 404, 'Not found');
    return;
  }

  const allowed = enforceHttpRateLimit(res, whipRateLimiter, ctx.info?.ip, {
    route: '/whip',
    message: 'Too many WHIP requests. Please try again shortly.'
  });

  if (!allowed) {
    req.resume();
    return;
  }

  const auth = await resolveWhipAuth(req);

  if (!auth) {
    req.resume();
    sendUnauthorized(res);
    return;
  }

  const path = getWhipPathSegments(ctx.pathname);

  if (!path) {
    req.resume();
    sendJsonError(res, 404, 'Not found');
    return;
  }

  switch (req.method) {
    case 'POST':
      if (path.sessionId) {
        req.resume();
        sendJsonError(res, 404, 'Not found');
        return;
      }

      if (hasUnsupportedContentType(req, 'application/sdp')) {
        req.resume();
        sendJsonError(res, 415, 'Content-Type must be application/sdp');
        return;
      }

      await handleWhipPost(req, res, path.channelId, auth);
      return;
    case 'PATCH':
      if (hasUnsupportedContentType(req, 'application/trickle-ice-sdpfrag')) {
        req.resume();
        sendJsonError(
          res,
          415,
          'Content-Type must be application/trickle-ice-sdpfrag'
        );
        return;
      }

      await handleWhipPatch(req, res, path.channelId, path.sessionId);
      return;
    case 'DELETE':
      handleWhipDelete(res, path.channelId, path.sessionId);
      return;
    default:
      res.setHeader('Allow', 'POST, PATCH, DELETE');
      sendJsonError(res, 405, 'Method not allowed');
      return;
  }
};

export { whipRouteHandler };
