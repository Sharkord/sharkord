import type {
  Router,
  RtpCodecCapability,
  RtpEncodingParameters,
  RtpParameters
} from 'mediasoup/types';
import sdpTransform from 'sdp-transform';

type TWhipMediaKind = 'audio' | 'video';

// the algorithms mediasoup accepts on transport.connect(), in SDP spelling
const FINGERPRINT_ALGORITHMS = [
  'sha-1',
  'sha-224',
  'sha-256',
  'sha-384',
  'sha-512'
] as const;

type TFingerprintAlgorithm = (typeof FINGERPRINT_ALGORITHMS)[number];

// thrown for anything wrong with the client's offer; the route handler maps
// this to a 400 response, anything else is a server-side failure
class WhipSdpError extends Error {}

type TParsedWhipMedia = {
  kind: TWhipMediaKind;
  mid: string;
  rtpParameters: RtpParameters;
  // role of the remote peer for transport.connect(), derived from the offer
  // setup attribute paired with the setup we will answer with
  remoteDtlsRole: 'client' | 'server';
  answerSetup: 'active' | 'passive';
  remoteFingerprint: { algorithm: TFingerprintAlgorithm; value: string };
  remoteIceUfrag: string;
  // offer attributes kept as-is so the answer can mirror them
  answerPayloadTypes: number[];
  answerRtp: sdpTransform.MediaDescription['rtp'];
  answerFmtp: sdpTransform.MediaDescription['fmtp'];
  answerRtcpFb: NonNullable<sdpTransform.MediaDescription['rtcpFb']>;
  answerExtensions: NonNullable<sdpTransform.MediaDescription['ext']>;
};

const parseFmtpConfig = (config: string): Record<string, string | number> => {
  const parameters: Record<string, string | number> = {};

  for (const pair of config.split(';')) {
    const separatorIndex = pair.indexOf('=');
    const key = separatorIndex === -1 ? pair : pair.slice(0, separatorIndex);
    const value = separatorIndex === -1 ? '' : pair.slice(separatorIndex + 1);
    const trimmedKey = key.trim();

    if (trimmedKey) {
      // mediasoup compares fmtp values strictly against the router codec
      // parameters, where digit-only values are numbers (same normalization
      // mediasoup-client applies); hex values like profile-level-id stay strings
      const trimmedValue = value.trim();

      parameters[trimmedKey] = /^\d+$/.test(trimmedValue)
        ? Number(trimmedValue)
        : trimmedValue;
    }
  }

  return parameters;
};

// mirrors mediasoup's ortc.matchCodecs with strict=true, which is what
// transport.produce() runs per codec: anything this rejects would make
// produce() throw for the whole m-line
type TCodecParameters = Record<string, unknown>;

const getH264Profile = (parameters: TCodecParameters) => {
  return String(parameters['profile-level-id'] ?? '42001f')
    .slice(0, 4)
    .toLowerCase();
};

const getH264Level = (parameters: TCodecParameters) => {
  return String(parameters['profile-level-id'] ?? '42001f')
    .slice(4, 6)
    .toLowerCase();
};

const isLevelAsymmetryAllowed = (parameters: TCodecParameters) => {
  return Number(parameters['level-asymmetry-allowed']) === 1;
};

const strictlyMatchesRouterCodec = (
  entry: sdpTransform.MediaDescription['rtp'][number],
  parameters: TCodecParameters,
  mimeType: string,
  routerCodec: RtpCodecCapability
) => {
  const lowerMimeType = mimeType.toLowerCase();

  if (
    routerCodec.mimeType.toLowerCase() !== lowerMimeType ||
    routerCodec.clockRate !== entry.rate
  ) {
    return false;
  }

  const routerParameters: TCodecParameters = routerCodec.parameters ?? {};

  if (lowerMimeType === 'audio/multiopus') {
    return (
      routerParameters['num_streams'] === parameters['num_streams'] &&
      routerParameters['coupled_streams'] === parameters['coupled_streams']
    );
  }

  if (lowerMimeType === 'video/h264') {
    if (
      Number(parameters['packetization-mode'] ?? 0) !==
      Number(routerParameters['packetization-mode'] ?? 0)
    ) {
      return false;
    }

    if (getH264Profile(parameters) !== getH264Profile(routerParameters)) {
      return false;
    }

    // mediasoup generates the answer profile-level-id for the pair and
    // rejects it when levels differ without level-asymmetry-allowed
    if (
      getH264Level(parameters) !== getH264Level(routerParameters) &&
      !(
        isLevelAsymmetryAllowed(parameters) &&
        isLevelAsymmetryAllowed(routerParameters)
      )
    ) {
      return false;
    }

    return true;
  }

  if (lowerMimeType === 'video/vp9') {
    return (
      Number(parameters['profile-id'] ?? 0) ===
      Number(routerParameters['profile-id'] ?? 0)
    );
  }

  return true;
};

// the a=simulcast attribute orders rids high to low and each layer may carry
// ";"-separated alternatives, of which the first one is the one in use
const getSimulcastRids = (media: sdpTransform.MediaDescription): string[] => {
  const ridList = (media.rids ?? [])
    .filter((rid) => !rid.direction || rid.direction === 'send')
    .map((rid) => String(rid.id));

  if (!ridList.length) return [];

  const simulcast = media.simulcast;
  const sendList =
    simulcast?.dir1 === 'send'
      ? simulcast.list1
      : simulcast?.dir2 === 'send'
        ? simulcast.list2
        : undefined;

  if (!sendList) return ridList;

  const ordered = sendList
    .split(' ')
    .map((alternative) => alternative.split(';')[0] ?? '')
    .filter((rid) => ridList.includes(rid));

  return ordered.length ? ordered : ridList;
};

const parseWhipOffer = (
  offerSdp: string,
  router: Router
): TParsedWhipMedia[] => {
  let session: sdpTransform.SessionDescription;

  try {
    session = sdpTransform.parse(offerSdp);
  } catch {
    throw new WhipSdpError('invalid SDP offer');
  }

  if (!session.media?.length) {
    throw new WhipSdpError('offer contains no media sections');
  }

  const routerCodecs = router.rtpCapabilities.codecs ?? [];
  const routerExtensions = router.rtpCapabilities.headerExtensions ?? [];
  const parsedMedias: TParsedWhipMedia[] = [];

  session.media.forEach((media, index) => {
    if (
      (media.type !== 'audio' && media.type !== 'video') ||
      media.port === 0 ||
      media.direction === 'recvonly' ||
      media.direction === 'inactive'
    ) {
      return;
    }

    const kind = media.type;
    const fmtpByPayload = new Map(
      (media.fmtp ?? []).map((fmtp) => [fmtp.payload, fmtp.config])
    );

    const acceptedPayloadTypes = new Set<number>();
    const codecs: RtpParameters['codecs'] = [];

    for (const entry of media.rtp) {
      if (!entry.payload || !entry.codec || !entry.rate) continue;

      const lowerMimeType = `${kind}/${entry.codec}`.toLowerCase();

      if (
        lowerMimeType.endsWith('/rtx') ||
        lowerMimeType.endsWith('/telephone-event')
      ) {
        continue;
      }

      const mimeType = `${kind}/${entry.codec}`;
      const parameters = parseFmtpConfig(
        fmtpByPayload.get(entry.payload) ?? ''
      );

      const routerCodec = routerCodecs.find((candidate) => {
        if (
          candidate.kind !== kind ||
          candidate.mimeType.toLowerCase() !== mimeType.toLowerCase()
        ) {
          return false;
        }

        // the rtpmap encoding suffix carries the channel count for audio and
        // has to agree with the router codec (video has no channel count)
        if (
          kind === 'audio' &&
          candidate.channels !== undefined &&
          entry.encoding !== undefined &&
          candidate.channels !== entry.encoding
        ) {
          return false;
        }

        return strictlyMatchesRouterCodec(entry, parameters, mimeType, candidate);
      });

      if (!routerCodec) continue;

      const rtcpFeedback = (media.rtcpFb ?? [])
        .filter(
          (feedback) =>
            feedback.payload === entry.payload &&
            (routerCodec.rtcpFeedback ?? []).some(
              (routerFeedback) =>
                routerFeedback.type === feedback.type &&
                routerFeedback.parameter === feedback.subtype
            )
        )
        .map((feedback) => ({
          type: feedback.type,
          parameter: feedback.subtype
        }));

      codecs.push({
        mimeType: routerCodec.mimeType,
        payloadType: entry.payload,
        clockRate: entry.rate,
        ...(kind === 'audio' && entry.encoding
          ? { channels: entry.encoding }
          : {}),
        parameters,
        rtcpFeedback
      });

      acceptedPayloadTypes.add(entry.payload);
    }

    // a media section with no codec the router can produce is declined
    // entirely (left out of the answer) instead of failing the whole offer
    if (!codecs.length) return;

    // rtx is kept only when its apt points at an accepted media codec, which
    // is what mediasoup validates on produce()
    for (const entry of media.rtp) {
      if (
        !entry.payload ||
        !entry.rate ||
        `${kind}/${entry.codec}`.toLowerCase() !== `${kind}/rtx`
      ) {
        continue;
      }

      const config = parseFmtpConfig(fmtpByPayload.get(entry.payload) ?? '');
      const apt = Number(config['apt']);

      if (!Number.isInteger(apt) || !acceptedPayloadTypes.has(apt)) continue;

      codecs.push({
        mimeType: `${kind}/rtx`,
        payloadType: entry.payload,
        clockRate: entry.rate,
        parameters: { apt },
        rtcpFeedback: []
      });

      acceptedPayloadTypes.add(entry.payload);
    }

    const headerExtensions: NonNullable<RtpParameters['headerExtensions']> = (
      media.ext ?? []
    )
      .filter((extension) =>
        routerExtensions.some(
          (routerExtension) =>
            routerExtension.uri === extension.uri &&
            routerExtension.kind === kind
        )
      )
      .map((extension) => ({
        uri: extension.uri as NonNullable<
          RtpParameters['headerExtensions']
        >[number]['uri'],
        id: extension.value
      }));

    let encodings: RtpEncodingParameters[];

    const simulcastRids = getSimulcastRids(media);

    if (simulcastRids.length) {
      // a=simulcast lists rids most-preferred (highest quality) first, while
      // mediasoup addresses spatial layer 0 as the lowest, so the encodings
      // are reversed to keep layer indexing consistent with mediasoup-client
      // producers (encoding 0 = low)
      encodings = [...simulcastRids].reverse().map((rid) => ({ rid }));
    } else {
      const primarySsrc = media.ssrcs?.[0];

      if (!primarySsrc) {
        // mediasoup cannot demux a track with neither ssrc nor rid
        return;
      }

      const fidGroup = media.ssrcGroups?.find(
        (group) =>
          group.semantics === 'FID' &&
          group.ssrcs.split(' ')[0] === String(primarySsrc.id)
      );
      const rtxSsrcText = fidGroup?.ssrcs.split(' ')[1];
      const rtxSsrc =
        rtxSsrcText !== undefined && Number.isInteger(Number(rtxSsrcText))
          ? Number(rtxSsrcText)
          : undefined;

      encodings = [
        {
          ssrc: primarySsrc.id,
          ...(rtxSsrc !== undefined ? { rtx: { ssrc: rtxSsrc } } : {})
        }
      ];
    }

    const iceUfrag = media.iceUfrag ?? session.iceUfrag;
    const icePwd = media.icePwd ?? session.icePwd;

    if (!iceUfrag || !icePwd) {
      throw new WhipSdpError('offer is missing ICE credentials');
    }

    const fingerprint = media.fingerprint ?? session.fingerprint;

    if (!fingerprint?.type || !fingerprint?.hash) {
      throw new WhipSdpError('offer is missing a DTLS fingerprint');
    }

    const fingerprintAlgorithm = fingerprint.type.toLowerCase();

    if (
      !FINGERPRINT_ALGORITHMS.includes(
        fingerprintAlgorithm as TFingerprintAlgorithm
      )
    ) {
      throw new WhipSdpError(
        `unsupported DTLS fingerprint algorithm "${fingerprint.type}"`
      );
    }

    const setup = media.setup ?? 'actpass';

    if (setup === 'holdconn') {
      throw new WhipSdpError('unsupported DTLS setup "holdconn"');
    }

    // the offerer that is DTLS active initiates the handshake, so we answer
    // passive and tell mediasoup the remote acts as the client
    const remoteDtlsRole: TParsedWhipMedia['remoteDtlsRole'] =
      setup === 'passive' ? 'server' : 'client';
    const answerSetup: TParsedWhipMedia['answerSetup'] =
      setup === 'passive' ? 'active' : 'passive';

    parsedMedias.push({
      kind,
      // sdp-transform hands back digit-only mids as numbers, while mediasoup
      // requires a string
      mid: String(media.mid ?? index),
      rtpParameters: {
        mid: String(media.mid ?? index),
        codecs,
        headerExtensions,
        encodings,
        rtcp: {
          cname:
            media.ssrcs?.find((ssrc) => ssrc.attribute === 'cname')?.value ??
            '-',
          reducedSize: true
        }
      },
      remoteDtlsRole,
      answerSetup,
      remoteFingerprint: {
        algorithm: fingerprintAlgorithm as TFingerprintAlgorithm,
        value: fingerprint.hash
      },
      remoteIceUfrag: iceUfrag,
      answerPayloadTypes: [...acceptedPayloadTypes],
      answerRtp: media.rtp.filter((entry) =>
        acceptedPayloadTypes.has(entry.payload)
      ),
      answerFmtp: (media.fmtp ?? []).filter((fmtp) =>
        acceptedPayloadTypes.has(fmtp.payload)
      ),
      answerRtcpFb: (media.rtcpFb ?? []).filter(
        (feedback) =>
          typeof feedback.payload === 'number' &&
          acceptedPayloadTypes.has(feedback.payload)
      ),
      answerExtensions: (media.ext ?? []).filter((extension) =>
        headerExtensions.some((kept) => kept.id === extension.value)
      )
    });
  });

  if (!parsedMedias.length) {
    throw new WhipSdpError(
      'offer contains no media section this server can receive'
    );
  }

  return parsedMedias;
};

type TWhipAnswerTransportParams = {
  iceParameters: { usernameFragment: string; password: string };
  iceCandidates: {
    foundation: number | string;
    priority: number | string;
    ip: string;
    announcedAddress?: string;
    announcedPort?: number;
    port: number;
    protocol: 'udp' | 'tcp';
    type: 'host' | 'srflx' | 'prflx' | 'relay';
  }[];
  dtlsParameters: {
    fingerprints: { algorithm: string; value: string }[];
  };
};

const buildWhipAnswer = (
  medias: TParsedWhipMedia[],
  transportParams: TWhipAnswerTransportParams
) => {
  const fingerprint =
    transportParams.dtlsParameters.fingerprints.find(
      (candidate) => candidate.algorithm === 'sha-256'
    ) ?? transportParams.dtlsParameters.fingerprints[0];

  if (!fingerprint) {
    throw new Error('transport is missing DTLS fingerprints');
  }

  const candidates = transportParams.iceCandidates.map((candidate) => ({
    foundation: String(candidate.foundation),
    component: 1,
    transport: candidate.protocol,
    priority: Number(candidate.priority),
    ip: candidate.announcedAddress ?? candidate.ip,
    port: candidate.announcedPort ?? candidate.port,
    type: candidate.type
  }));

  const answer: sdpTransform.SessionDescription = {
    version: 0,
    origin: {
      username: '-',
      sessionId: String(Date.now()),
      sessionVersion: 2,
      netType: 'IN',
      ipVer: 4,
      address: '127.0.0.1'
    },
    name: 'sharkord-whip',
    timing: { start: 0, stop: 0 },
    groups: [
      {
        type: 'BUNDLE',
        mids: medias.map((media) => media.mid).join(' ')
      }
    ],
    msidSemantic: { semantic: 'WMS', token: '*' },
    media: medias.map((media) => ({
      type: media.kind,
      port: 9,
      protocol: 'UDP/TLS/RTP/SAVPF',
      payloads: media.answerPayloadTypes.join(' '),
      rtp: media.answerRtp,
      fmtp: media.answerFmtp,
      rtcpFb: media.answerRtcpFb,
      ext: media.answerExtensions,
      direction: 'recvonly' as const,
      mid: media.mid,
      rtcpMux: 'rtcp-mux' as const,
      iceUfrag: transportParams.iceParameters.usernameFragment,
      icePwd: transportParams.iceParameters.password,
      fingerprint: {
        type: fingerprint.algorithm,
        hash: fingerprint.value
      },
      setup: media.answerSetup,
      candidates,
      endOfCandidates: 'end-of-candidates' as const
    }))
  };

  return sdpTransform.write(answer);
};

// PATCH bodies are ICE fragments, not full SDPs, so only the candidate lines
// and the ice-ufrag are pulled out with a line scan
const parseIceFragment = (body: string) => {
  const lines = body.split(/\r?\n/);
  const ufrag = lines
    .find((line) => line.startsWith('a=ice-ufrag:'))
    ?.slice('a=ice-ufrag:'.length);

  const candidates = lines
    .filter((line) => line.startsWith('a=candidate:'))
    .map((line) => line.slice('a='.length));

  return { ufrag, candidates };
};

export { buildWhipAnswer, parseIceFragment, parseWhipOffer, WhipSdpError };
export type { TParsedWhipMedia, TWhipAnswerTransportParams };
