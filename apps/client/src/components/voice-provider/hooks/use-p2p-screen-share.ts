import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { useOwnUserId } from '@/features/server/users/hooks';
import { logVoiceError, logVoiceWarn } from '@/helpers/browser-logger';
import { getTRPCClient } from '@/lib/trpc';
import type { TDirectScreenShareStatus, TRemoteUserStreamKinds } from '@/types';
import {
  DIRECT_SCREEN_SHARE_MAX_ATTEMPTS,
  StreamKind,
  type TDirectScreenShareSignal
} from '@sharkord/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  runDirectScreenShareAttempts,
  waitForDirectScreenShareConnection
} from './direct-screen-share-retry';

type TDirectIceCandidate = Extract<
  TDirectScreenShareSignal,
  { type: 'candidate' }
>['candidate'];

type TDirectPeer = {
  connection: RTCPeerConnection;
  sharerId: number;
  sessionId: string;
  attempt: number;
  remoteUserId?: number;
  signalingReady: boolean;
  pendingLocalCandidates: TDirectIceCandidate[];
  pendingRemoteCandidates: TDirectIceCandidate[];
  failureReported: boolean;
  hasConnected: boolean;
  disconnectTimer?: ReturnType<typeof setTimeout>;
};

type TEarlyCandidateMap = Map<number, Map<string, TDirectIceCandidate[]>>;

const candidateKey = (sessionId: string, attempt: number) =>
  `${sessionId}:${attempt}`;

const createDirectScreenShareAbortError = () => {
  const error = new Error('Direct screen share attempts were aborted');
  error.name = 'AbortError';
  return error;
};

const queueEarlyCandidate = (
  candidates: TEarlyCandidateMap,
  sharerId: number,
  sessionId: string,
  attempt: number,
  candidate: TDirectIceCandidate
) => {
  let candidatesByAttempt = candidates.get(sharerId);

  if (!candidatesByAttempt) {
    candidatesByAttempt = new Map();
    candidates.set(sharerId, candidatesByAttempt);
  }

  const key = candidateKey(sessionId, attempt);
  const pendingCandidates = candidatesByAttempt.get(key) ?? [];

  if (pendingCandidates.length >= 50) return;

  pendingCandidates.push(candidate);
  candidatesByAttempt.set(key, pendingCandidates);
};

const takeEarlyCandidates = (
  candidates: TEarlyCandidateMap,
  sharerId: number,
  sessionId: string,
  attempt: number
) => {
  const candidatesByAttempt = candidates.get(sharerId);

  if (!candidatesByAttempt) return [];

  const pendingCandidates =
    candidatesByAttempt.get(candidateKey(sessionId, attempt)) ?? [];

  for (const key of candidatesByAttempt.keys()) {
    if (
      key.startsWith(`${sessionId}:`) &&
      Number(key.split(':')[1]) <= attempt
    ) {
      candidatesByAttempt.delete(key);
    }
  }

  if (candidatesByAttempt.size === 0) candidates.delete(sharerId);

  return pendingCandidates;
};

type TUseP2PScreenShareParams = {
  isVoiceSessionActive: boolean;
  addRemoteUserStream: (
    userId: number,
    stream: MediaStream,
    kind: TRemoteUserStreamKinds
  ) => void;
  removeRemoteUserStream: (
    userId: number,
    kind: TRemoteUserStreamKinds
  ) => void;
};

const useP2PScreenShare = ({
  isVoiceSessionActive,
  addRemoteUserStream,
  removeRemoteUserStream
}: TUseP2PScreenShareParams) => {
  const { t } = useTranslation('common');
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const ownUserId = useOwnUserId();
  const [status, setStatus] = useState<TDirectScreenShareStatus>('idle');
  const [iceServers, setIceServers] = useState<RTCIceServer[]>([]);
  const peerRef = useRef<TDirectPeer | null>(null);
  const earlyCandidatesRef = useRef<TEarlyCandidateMap>(new Map());
  const activeStartAbortControllerRef = useRef<AbortController | null>(null);
  const activeStartSessionRef = useRef<string | null>(null);
  const activeStartAttemptRef = useRef(0);

  const setDirectStatus = useCallback(
    (nextStatus: TDirectScreenShareStatus) => {
      setStatus(nextStatus);
    },
    []
  );

  const failPeer = useCallback(
    (peer: TDirectPeer, error?: unknown) => {
      if (peer.failureReported) return;

      peer.failureReported = true;
      setDirectStatus('failed');

      if (error) {
        logVoiceError('screen: direct connection failed', error, {
          remoteUserId: peer.remoteUserId
        });
      }

      toast.error(t('directScreenShareFailed'));
    },
    [setDirectStatus, t]
  );

  const closePeer = useCallback(
    (peer: TDirectPeer) => {
      peer.connection.onicecandidate = null;
      peer.connection.ontrack = null;
      peer.connection.onconnectionstatechange = null;
      if (peer.disconnectTimer) clearTimeout(peer.disconnectTimer);
      peer.pendingLocalCandidates.length = 0;
      peer.pendingRemoteCandidates.length = 0;
      peer.connection.close();

      if (peer.remoteUserId !== undefined) {
        removeRemoteUserStream(peer.remoteUserId, StreamKind.SCREEN);
        removeRemoteUserStream(peer.remoteUserId, StreamKind.SCREEN_AUDIO);
      }

      if (peerRef.current === peer) {
        peerRef.current = null;
      }
    },
    [removeRemoteUserStream]
  );

  const rejectPeerAttempt = useCallback(
    (peer: TDirectPeer, error?: unknown) => {
      if (peerRef.current !== peer) return;

      if (peer.hasConnected) {
        failPeer(peer, error);
        closePeer(peer);
        return;
      }

      if (error) {
        logVoiceWarn('screen: direct connection attempt failed', {
          attempt: peer.attempt,
          error
        });
      }

      closePeer(peer);
    },
    [closePeer, failPeer]
  );

  const sendLocalCandidate = useCallback(
    async (peer: TDirectPeer, candidate: TDirectIceCandidate) => {
      if (peerRef.current !== peer) return;

      if (!peer.signalingReady || peer.remoteUserId === undefined) {
        peer.pendingLocalCandidates.push(candidate);
        return;
      }

      try {
        const trpc = getTRPCClient();

        await trpc.voice.signalDirectScreenShare.mutate({
          type: 'candidate',
          sharerId: peer.sharerId,
          sessionId: peer.sessionId,
          attempt: peer.attempt,
          candidate
        });
      } catch (error) {
        rejectPeerAttempt(peer, error);
      }
    },
    [rejectPeerAttempt]
  );

  const flushLocalCandidates = useCallback(
    async (peer: TDirectPeer) => {
      const candidates = peer.pendingLocalCandidates.splice(0);

      for (const candidate of candidates) {
        await sendLocalCandidate(peer, candidate);
      }
    },
    [sendLocalCandidate]
  );

  const flushRemoteCandidates = useCallback(async (peer: TDirectPeer) => {
    const candidates = peer.pendingRemoteCandidates.splice(0);

    for (const candidate of candidates) {
      if (peerRef.current !== peer) return;
      await peer.connection.addIceCandidate(candidate);
    }
  }, []);

  const createPeer = useCallback(
    (
      sharerId: number,
      sessionId: string,
      attempt: number,
      remoteUserId?: number
    ): TDirectPeer => {
      const connection = new RTCPeerConnection({ iceServers });
      const peer: TDirectPeer = {
        connection,
        sharerId,
        sessionId,
        attempt,
        remoteUserId,
        signalingReady: false,
        pendingLocalCandidates: [],
        pendingRemoteCandidates: [],
        failureReported: false,
        hasConnected: false
      };

      peerRef.current = peer;

      connection.onicecandidate = (event) => {
        if (!event.candidate || peerRef.current !== peer) return;

        const candidate = event.candidate.toJSON();

        if (candidate.candidate === undefined) return;

        sendLocalCandidate(peer, {
          ...candidate,
          candidate: candidate.candidate
        }).catch((error) => {
          rejectPeerAttempt(peer, error);
        });
      };

      connection.ontrack = (event) => {
        const remoteUserId = peer.remoteUserId;

        if (peerRef.current !== peer || remoteUserId === undefined) return;

        const kind =
          event.track.kind === 'video'
            ? StreamKind.SCREEN
            : StreamKind.SCREEN_AUDIO;
        const stream = new MediaStream([event.track]);

        addRemoteUserStream(remoteUserId, stream, kind);
        event.track.onended = () => {
          if (peerRef.current !== peer) return;
          removeRemoteUserStream(remoteUserId, kind);
        };
      };

      connection.onconnectionstatechange = () => {
        if (peerRef.current !== peer) return;

        if (connection.connectionState === 'connected') {
          if (peer.disconnectTimer) clearTimeout(peer.disconnectTimer);
          peer.disconnectTimer = undefined;
          peer.hasConnected = true;
          setDirectStatus('connected');
        } else if (connection.connectionState === 'failed') {
          rejectPeerAttempt(peer);
        } else if (
          connection.connectionState === 'disconnected' &&
          peer.hasConnected &&
          !peer.disconnectTimer
        ) {
          peer.disconnectTimer = setTimeout(() => {
            peer.disconnectTimer = undefined;
            if (
              peerRef.current === peer &&
              connection.connectionState === 'disconnected'
            ) {
              rejectPeerAttempt(peer);
            }
          }, 4_000);
        }
      };

      return peer;
    },
    [
      addRemoteUserStream,
      iceServers,
      rejectPeerAttempt,
      removeRemoteUserStream,
      sendLocalCandidate,
      setDirectStatus
    ]
  );

  const start = useCallback(
    async (stream: MediaStream, maxBitrateKbps: number) => {
      if (typeof RTCPeerConnection === 'undefined') {
        setDirectStatus('failed');
        throw new Error(
          'Direct screen sharing is not supported by this browser'
        );
      }

      if (ownUserId === null || ownUserId === undefined) {
        setDirectStatus('failed');
        throw new Error('The current user could not be identified');
      }

      activeStartAbortControllerRef.current?.abort();
      const abortController = new AbortController();
      const sessionId = crypto.randomUUID();
      activeStartAbortControllerRef.current = abortController;
      activeStartSessionRef.current = sessionId;
      const videoTracks = stream.getVideoTracks();
      const abortOnVideoTrackEnded = () => abortController.abort();

      videoTracks.forEach((track) => {
        track.addEventListener('ended', abortOnVideoTrackEnded, { once: true });
      });

      if (videoTracks.some((track) => track.readyState === 'ended')) {
        abortController.abort();
      }

      let serverNegotiationMayExist = false;
      let lastAttemptError: unknown;

      setDirectStatus('connecting');

      try {
        const connected = await runDirectScreenShareAttempts(
          async (attemptNumber) => {
            let attemptPeer: TDirectPeer | null = null;
            let offerSent = false;
            let offerAcknowledged = false;
            activeStartAttemptRef.current = attemptNumber;

            try {
              const peer = createPeer(ownUserId, sessionId, attemptNumber);
              attemptPeer = peer;

              for (const track of stream.getTracks()) {
                const sender = peer.connection.addTrack(track, stream);

                if (track.kind !== 'video') continue;

                const parameters = sender.getParameters();

                if (parameters.encodings.length === 0) {
                  parameters.encodings = [{}];
                }

                parameters.encodings[0]!.maxBitrate = maxBitrateKbps * 1000;

                try {
                  await sender.setParameters(parameters);
                } catch (error) {
                  logVoiceWarn('screen: direct bitrate could not be applied', {
                    error
                  });
                }
              }

              const offer = await peer.connection.createOffer();

              if (abortController.signal.aborted) return false;

              await peer.connection.setLocalDescription(offer);

              const description = peer.connection.localDescription;

              if (!description?.sdp) {
                throw new Error('The direct screen share offer was empty');
              }

              if (abortController.signal.aborted) return false;

              const trpc = getTRPCClient();
              serverNegotiationMayExist = true;
              let peerUserId: number | undefined;

              // a lost response does not mean the offer was rejected by the server.
              // resend the same offer before moving to the next attempt.
              for (
                let send = 0;
                send < 3 && peerUserId === undefined;
                send += 1
              ) {
                if (abortController.signal.aborted)
                  throw createDirectScreenShareAbortError();

                try {
                  offerSent = true;
                  const result = await trpc.voice.startDirectScreenShare.mutate(
                    {
                      sessionId,
                      attempt: attemptNumber,
                      description: { type: 'offer', sdp: description.sdp }
                    }
                  );
                  peerUserId = result.peerUserId;
                  offerAcknowledged = true;
                } catch (error) {
                  if (send === 2) throw error;
                }
              }

              if (peerRef.current !== peer || peerUserId === undefined)
                return false;

              peer.remoteUserId = peerUserId;
              peer.signalingReady = true;

              await flushLocalCandidates(peer);

              const attemptConnected = await waitForDirectScreenShareConnection(
                peer.connection,
                undefined,
                abortController.signal
              );

              if (!attemptConnected) {
                lastAttemptError = new Error(
                  `Direct screen share attempt ${attemptNumber} did not connect`
                );

                if (peerRef.current === peer) {
                  logVoiceWarn(
                    'screen: direct connection attempt did not connect',
                    {
                      attempt: attemptNumber,
                      connectionState: peer.connection.connectionState
                    }
                  );
                  closePeer(peer);
                }
              }

              return (
                attemptConnected &&
                peerRef.current === peer &&
                peer.connection.connectionState === 'connected'
              );
            } catch (error) {
              if (abortController.signal.aborted) throw error;

              lastAttemptError = error;

              if (attemptPeer && peerRef.current === attemptPeer) {
                logVoiceWarn('screen: direct connection attempt failed', {
                  attempt: attemptNumber,
                  error
                });
                closePeer(attemptPeer);
              }

              if (offerSent && !offerAcknowledged) throw error;

              return false;
            }
          },
          undefined,
          abortController.signal
        );

        if (abortController.signal.aborted) {
          throw createDirectScreenShareAbortError();
        }

        if (!connected) {
          throw (
            lastAttemptError ??
            new Error(
              `Direct screen share failed after ${DIRECT_SCREEN_SHARE_MAX_ATTEMPTS} attempts`
            )
          );
        }
      } catch (error) {
        const wasAborted =
          abortController.signal.aborted ||
          (error instanceof Error && error.name === 'AbortError');
        const peer = peerRef.current;

        if (peer?.sharerId === ownUserId) closePeer(peer);

        if (serverNegotiationMayExist) {
          try {
            const trpc = getTRPCClient();

            await trpc.voice.stopDirectScreenShare.mutate({
              sessionId,
              attempt: activeStartAttemptRef.current
            });
          } catch (stopError) {
            logVoiceError(
              'screen: direct negotiation cleanup failed',
              stopError
            );
          }
        }

        setDirectStatus(wasAborted ? 'idle' : 'failed');
        throw error;
      } finally {
        videoTracks.forEach((track) => {
          track.removeEventListener('ended', abortOnVideoTrackEnded);
        });

        if (activeStartAbortControllerRef.current === abortController) {
          activeStartAbortControllerRef.current = null;
          activeStartSessionRef.current = null;
          activeStartAttemptRef.current = 0;
        }
      }
    },
    [closePeer, createPeer, flushLocalCandidates, ownUserId, setDirectStatus]
  );

  const handleOffer = useCallback(
    async (signal: Extract<TDirectScreenShareSignal, { type: 'offer' }>) => {
      const peer = createPeer(
        signal.sharerId,
        signal.sessionId,
        signal.attempt,
        signal.senderId
      );
      peer.pendingRemoteCandidates.push(
        ...takeEarlyCandidates(
          earlyCandidatesRef.current,
          signal.sharerId,
          signal.sessionId,
          signal.attempt
        )
      );
      setDirectStatus('connecting');

      try {
        await peer.connection.setRemoteDescription(signal.description);
        if (peerRef.current !== peer) return;

        await flushRemoteCandidates(peer);
        if (peerRef.current !== peer) return;

        const answer = await peer.connection.createAnswer();

        await peer.connection.setLocalDescription(answer);
        if (peerRef.current !== peer) return;

        const description = peer.connection.localDescription;

        if (!description?.sdp) {
          throw new Error('The direct screen share answer was empty');
        }

        const trpc = getTRPCClient();

        await trpc.voice.signalDirectScreenShare.mutate({
          type: 'answer',
          sharerId: signal.sharerId,
          sessionId: signal.sessionId,
          attempt: signal.attempt,
          description: { type: 'answer', sdp: description.sdp }
        });

        if (peerRef.current !== peer) return;

        peer.signalingReady = true;
        await flushLocalCandidates(peer);
      } catch (error) {
        rejectPeerAttempt(peer, error);
      }
    },
    [
      createPeer,
      flushLocalCandidates,
      flushRemoteCandidates,
      rejectPeerAttempt,
      setDirectStatus
    ]
  );

  const handleSignal = useCallback(
    async (signal: TDirectScreenShareSignal) => {
      if (signal.channelId !== currentVoiceChannelId) return;

      if (signal.type === 'stop') {
        const peer = peerRef.current;

        if (
          activeStartSessionRef.current === signal.sessionId &&
          signal.attempt < activeStartAttemptRef.current
        ) {
          return;
        }

        if (
          peer?.sharerId === signal.sharerId &&
          (signal.sessionId !== peer.sessionId || signal.attempt < peer.attempt)
        ) {
          return;
        }

        if (
          signal.sharerId === ownUserId &&
          activeStartSessionRef.current === signal.sessionId &&
          signal.attempt >= activeStartAttemptRef.current
        ) {
          activeStartAbortControllerRef.current?.abort();
        }

        if (peer?.sharerId === signal.sharerId) {
          closePeer(peer);

          if (signal.reason === 'stopped') {
            setDirectStatus('idle');
          } else {
            setDirectStatus('failed');
          }
        } else if (
          !peer &&
          activeStartSessionRef.current === signal.sessionId &&
          signal.reason === 'stopped'
        ) {
          setDirectStatus('idle');
        }

        const early = earlyCandidatesRef.current.get(signal.sharerId);
        for (const key of early?.keys() ?? []) {
          if (key.startsWith(`${signal.sessionId}:`)) early?.delete(key);
        }
        return;
      }

      if (signal.type === 'offer') {
        const peer = peerRef.current;

        if (peer) {
          if (peer.sharerId !== signal.sharerId) {
            logVoiceWarn('screen: ignored offer from another direct peer', {
              sharerId: signal.sharerId
            });
            return;
          }

          if (peer.sessionId !== signal.sessionId) return;

          if (signal.attempt <= peer.attempt) return;

          closePeer(peer);
        }

        await handleOffer(signal);
        return;
      }

      const peer = peerRef.current;

      if (!peer) {
        if (signal.type === 'candidate') {
          queueEarlyCandidate(
            earlyCandidatesRef.current,
            signal.sharerId,
            signal.sessionId,
            signal.attempt,
            signal.candidate
          );
        }

        return;
      }

      if (peer.sharerId !== signal.sharerId) return;
      if (peer.sessionId !== signal.sessionId) return;
      if (signal.attempt < peer.attempt) return;

      if (signal.type === 'answer') {
        if (signal.attempt !== peer.attempt) return;

        try {
          await peer.connection.setRemoteDescription(signal.description);
          if (peerRef.current !== peer) return;

          await flushRemoteCandidates(peer);
        } catch (error) {
          rejectPeerAttempt(peer, error);
        }

        return;
      }

      if (signal.attempt > peer.attempt) {
        queueEarlyCandidate(
          earlyCandidatesRef.current,
          signal.sharerId,
          signal.sessionId,
          signal.attempt,
          signal.candidate
        );
        return;
      }

      if (!peer.connection.remoteDescription) {
        peer.pendingRemoteCandidates.push(signal.candidate);
        return;
      }

      try {
        await peer.connection.addIceCandidate(signal.candidate);
      } catch (error) {
        rejectPeerAttempt(peer, error);
      }
    },
    [
      closePeer,
      currentVoiceChannelId,
      flushRemoteCandidates,
      handleOffer,
      ownUserId,
      rejectPeerAttempt,
      setDirectStatus
    ]
  );

  const stop = useCallback(async () => {
    const activeStart = activeStartAbortControllerRef.current;
    const isStarting = activeStart !== null;

    activeStart?.abort();

    const peer = peerRef.current;

    if (!peer) {
      if (status !== 'failed') setDirectStatus('idle');
      return;
    }

    if (
      !isStarting &&
      peer.sharerId === ownUserId &&
      peer.remoteUserId !== undefined
    ) {
      try {
        const trpc = getTRPCClient();

        await trpc.voice.stopDirectScreenShare.mutate({
          sessionId: peer.sessionId,
          attempt: peer.attempt
        });
      } catch (error) {
        logVoiceError('screen: direct stop signal failed', error);
      }
    }

    closePeer(peer);

    if (status !== 'failed') setDirectStatus('idle');
  }, [closePeer, ownUserId, setDirectStatus, status]);

  const cleanup = useCallback(() => {
    activeStartAbortControllerRef.current?.abort();
    activeStartAbortControllerRef.current = null;
    activeStartSessionRef.current = null;
    activeStartAttemptRef.current = 0;

    if (peerRef.current) closePeer(peerRef.current);

    earlyCandidatesRef.current.clear();
    setDirectStatus('idle');
  }, [closePeer, setDirectStatus]);

  useEffect(() => {
    if (!currentVoiceChannelId || !isVoiceSessionActive) return;

    const trpc = getTRPCClient();
    const signalSubscription = trpc.voice.onDirectScreenShareSignal.subscribe(
      undefined,
      {
        onData: (signal) => {
          handleSignal(signal).catch((error) => {
            logVoiceError('screen: direct signal handler failed', error);
          });
        },
        onError: (error) => {
          logVoiceError('screen: direct signal subscription failed', error);
        }
      }
    );

    const leaveSubscription = trpc.voice.onLeave.subscribe(undefined, {
      onData: ({ channelId, userId }) => {
        if (channelId !== currentVoiceChannelId) return;

        const peer = peerRef.current;

        if (peer?.remoteUserId !== userId) return;

        if (peer.sharerId === ownUserId) {
          activeStartAbortControllerRef.current?.abort();
        }

        closePeer(peer);
        setDirectStatus(peer.sharerId === ownUserId ? 'failed' : 'idle');
      },
      onError: (error) => {
        logVoiceError('screen: peer leave subscription failed', error);
      }
    });

    return () => {
      signalSubscription.unsubscribe();
      leaveSubscription.unsubscribe();
    };
  }, [
    closePeer,
    currentVoiceChannelId,
    handleSignal,
    isVoiceSessionActive,
    ownUserId,
    setDirectStatus
  ]);

  return {
    status,
    setStatus: setDirectStatus,
    setIceServers,
    start,
    stop,
    cleanup
  };
};

export { useP2PScreenShare };
