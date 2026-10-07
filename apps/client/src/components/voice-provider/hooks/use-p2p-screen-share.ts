import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { useOwnUserId } from '@/features/server/users/hooks';
import { logVoiceError, logVoiceWarn } from '@/helpers/browser-logger';
import { getTRPCClient } from '@/lib/trpc';
import type { TDirectScreenShareStatus, TRemoteUserStreamKinds } from '@/types';
import { StreamKind, type TDirectScreenShareSignal } from '@sharkord/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TDirectIceCandidate = Extract<
  TDirectScreenShareSignal,
  { type: 'candidate' }
>['candidate'];

type TDirectPeer = {
  connection: RTCPeerConnection;
  sharerId: number;
  remoteUserId?: number;
  signalingReady: boolean;
  pendingLocalCandidates: TDirectIceCandidate[];
  pendingRemoteCandidates: TDirectIceCandidate[];
  failureReported: boolean;
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
  const earlyCandidatesRef = useRef<Map<number, TDirectIceCandidate[]>>(
    new Map()
  );

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

  const sendLocalCandidate = useCallback(
    async (peer: TDirectPeer, candidate: TDirectIceCandidate) => {
      if (!peer.signalingReady || peer.remoteUserId === undefined) {
        peer.pendingLocalCandidates.push(candidate);
        return;
      }

      try {
        const trpc = getTRPCClient();

        await trpc.voice.signalDirectScreenShare.mutate({
          type: 'candidate',
          sharerId: peer.sharerId,
          candidate
        });
      } catch (error) {
        failPeer(peer, error);
      }
    },
    [failPeer]
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
      await peer.connection.addIceCandidate(candidate);
    }
  }, []);

  const createPeer = useCallback(
    (sharerId: number, remoteUserId?: number): TDirectPeer => {
      const connection = new RTCPeerConnection({ iceServers });
      const peer: TDirectPeer = {
        connection,
        sharerId,
        remoteUserId,
        signalingReady: false,
        pendingLocalCandidates: [],
        pendingRemoteCandidates: [],
        failureReported: false
      };

      peerRef.current = peer;

      connection.onicecandidate = (event) => {
        if (!event.candidate) return;

        const candidate = event.candidate.toJSON();

        if (candidate.candidate === undefined) return;

        sendLocalCandidate(peer, {
          ...candidate,
          candidate: candidate.candidate
        }).catch((error) => {
          failPeer(peer, error);
        });
      };

      connection.ontrack = (event) => {
        const remoteUserId = peer.remoteUserId;

        if (remoteUserId === undefined) return;

        const kind =
          event.track.kind === 'video'
            ? StreamKind.SCREEN
            : StreamKind.SCREEN_AUDIO;
        const stream = new MediaStream([event.track]);

        addRemoteUserStream(remoteUserId, stream, kind);
        event.track.onended = () => {
          removeRemoteUserStream(remoteUserId, kind);
        };
      };

      connection.onconnectionstatechange = () => {
        if (connection.connectionState === 'connected') {
          setDirectStatus('connected');
        } else if (
          connection.connectionState === 'failed' ||
          connection.connectionState === 'disconnected'
        ) {
          failPeer(peer);
        }
      };

      return peer;
    },
    [
      addRemoteUserStream,
      failPeer,
      iceServers,
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

      setDirectStatus('connecting');

      let peer: TDirectPeer | undefined;

      try {
        peer = createPeer(ownUserId);

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

        await peer.connection.setLocalDescription(offer);

        const description = peer.connection.localDescription;

        if (!description?.sdp) {
          throw new Error('The direct screen share offer was empty');
        }

        const trpc = getTRPCClient();
        const { peerUserId } = await trpc.voice.startDirectScreenShare.mutate({
          description: { type: 'offer', sdp: description.sdp }
        });

        peer.remoteUserId = peerUserId;
        peer.signalingReady = true;

        await flushLocalCandidates(peer);
      } catch (error) {
        setDirectStatus('failed');

        if (peer) {
          if (peer.remoteUserId !== undefined) {
            try {
              const trpc = getTRPCClient();

              await trpc.voice.stopDirectScreenShare.mutate({});
            } catch (stopError) {
              logVoiceError(
                'screen: direct negotiation cleanup failed',
                stopError
              );
            }
          }

          closePeer(peer);
        }

        throw error;
      }
    },
    [closePeer, createPeer, flushLocalCandidates, ownUserId, setDirectStatus]
  );

  const handleOffer = useCallback(
    async (signal: Extract<TDirectScreenShareSignal, { type: 'offer' }>) => {
      const peer = createPeer(signal.sharerId, signal.senderId);
      peer.pendingRemoteCandidates.push(
        ...(earlyCandidatesRef.current.get(signal.sharerId) ?? [])
      );
      earlyCandidatesRef.current.delete(signal.sharerId);
      setDirectStatus('connecting');

      await peer.connection.setRemoteDescription(signal.description);
      await flushRemoteCandidates(peer);

      const answer = await peer.connection.createAnswer();

      await peer.connection.setLocalDescription(answer);

      const description = peer.connection.localDescription;

      if (!description?.sdp) {
        throw new Error('The direct screen share answer was empty');
      }

      const trpc = getTRPCClient();

      await trpc.voice.signalDirectScreenShare.mutate({
        type: 'answer',
        sharerId: signal.sharerId,
        description: { type: 'answer', sdp: description.sdp }
      });

      peer.signalingReady = true;
      await flushLocalCandidates(peer);
    },
    [createPeer, flushLocalCandidates, flushRemoteCandidates, setDirectStatus]
  );

  const handleSignal = useCallback(
    async (signal: TDirectScreenShareSignal) => {
      if (signal.channelId !== currentVoiceChannelId) return;

      if (signal.type === 'stop') {
        const peer = peerRef.current;

        if (peer?.sharerId === signal.sharerId) {
          closePeer(peer);

          if (signal.reason === 'stopped') {
            setDirectStatus('idle');
          } else {
            failPeer(peer);
          }
        }

        earlyCandidatesRef.current.delete(signal.sharerId);

        return;
      }

      try {
        if (signal.type === 'offer') {
          if (peerRef.current) {
            throw new Error('A direct screen share is already active');
          }

          await handleOffer(signal);
          return;
        }

        if (signal.type === 'answer') {
          const peer = peerRef.current;

          if (!peer || peer.sharerId !== signal.sharerId) return;

          await peer.connection.setRemoteDescription(signal.description);
          await flushRemoteCandidates(peer);
          return;
        }

        const peer = peerRef.current;

        if (!peer || peer.sharerId !== signal.sharerId) {
          const candidates =
            earlyCandidatesRef.current.get(signal.sharerId) ?? [];

          candidates.push(signal.candidate);
          earlyCandidatesRef.current.set(signal.sharerId, candidates);

          return;
        }

        if (!peer.connection.remoteDescription) {
          peer.pendingRemoteCandidates.push(signal.candidate);
          return;
        }

        await peer.connection.addIceCandidate(signal.candidate);
      } catch (error) {
        const peer = peerRef.current;

        if (peer) {
          failPeer(peer, error);
        } else {
          setDirectStatus('failed');
          logVoiceError('screen: direct signalling failed', error);
          toast.error(t('directScreenShareFailed'));
        }
      }
    },
    [
      closePeer,
      currentVoiceChannelId,
      failPeer,
      flushRemoteCandidates,
      handleOffer,
      setDirectStatus,
      t
    ]
  );

  const stop = useCallback(async () => {
    const peer = peerRef.current;

    if (!peer) {
      if (status !== 'failed') setDirectStatus('idle');
      return;
    }

    if (peer.sharerId === ownUserId && peer.remoteUserId !== undefined) {
      try {
        const trpc = getTRPCClient();

        await trpc.voice.stopDirectScreenShare.mutate({});
      } catch (error) {
        logVoiceError('screen: direct stop signal failed', error);
      }
    }

    closePeer(peer);

    if (status !== 'failed') setDirectStatus('idle');
  }, [closePeer, ownUserId, setDirectStatus, status]);

  const cleanup = useCallback(() => {
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
