import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { useOwnUserId } from '@/features/server/users/hooks';
import { logVoice, logVoiceError } from '@/helpers/browser-logger';
import { getTRPCClient } from '@/lib/trpc';
import type { TRemoteUserStreamKinds } from '@/types';
import { StreamKind } from '@sharkord/shared';
import type { RtpCapabilities } from 'mediasoup-client/types';
import type { RefObject } from 'react';
import { useEffect } from 'react';

type TEvents = {
  consume: (
    remoteId: number,
    kind: StreamKind,
    rtpCapabilities: RtpCapabilities
  ) => Promise<void>;
  removeRemoteUserStream: (
    userId: number,
    kind: TRemoteUserStreamKinds
  ) => void;
  removeExternalStreamTrack: (
    streamId: number,
    kind: StreamKind.EXTERNAL_AUDIO | StreamKind.EXTERNAL_VIDEO
  ) => void;
  removeExternalStream: (streamId: number) => void;
  clearRemoteUserStreamsForUser: (userId: number) => void;
  rtpCapabilitiesRef: RefObject<RtpCapabilities | null | undefined>;
};

const useVoiceEvents = ({
  consume,
  removeRemoteUserStream,
  removeExternalStreamTrack,
  removeExternalStream,
  clearRemoteUserStreamsForUser,
  rtpCapabilitiesRef
}: TEvents) => {
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const ownUserId = useOwnUserId();

  useEffect(() => {
    if (!currentVoiceChannelId) {
      logVoice('events: not subscribed, no voice channel');
      return;
    }

    if (!rtpCapabilitiesRef.current) {
      logVoice('events: not subscribed, no rtp capabilities');
      return;
    }

    const trpc = getTRPCClient();

    let isCleaningUp = false;

    const onVoiceNewProducerSub = trpc.voice.onNewProducer.subscribe(
      undefined,
      {
        onData: ({ remoteId, kind, channelId }) => {
          if (currentVoiceChannelId !== channelId || isCleaningUp) return;

          if (remoteId === ownUserId) {
            logVoice('events: ignoring own new producer', { kind, channelId });

            return;
          }

          logVoice('events: new producer', { remoteId, kind, channelId });

          const rtpCapabilities = rtpCapabilitiesRef.current;

          if (!rtpCapabilities) return;

          try {
            consume(remoteId, kind, rtpCapabilities);
          } catch (error) {
            logVoiceError('events: consuming new producer failed', error, {
              remoteId,
              kind,
              channelId
            });
          }
        },
        onError: (error) => {
          logVoiceError('events: new producer subscription error', error);
        }
      }
    );

    const onVoiceProducerClosedSub = trpc.voice.onProducerClosed.subscribe(
      undefined,
      {
        onData: ({ channelId, remoteId, kind }) => {
          if (currentVoiceChannelId !== channelId || isCleaningUp) return;

          logVoice('events: producer closed', { remoteId, kind, channelId });

          try {
            if (
              kind === StreamKind.EXTERNAL_VIDEO ||
              kind === StreamKind.EXTERNAL_AUDIO
            ) {
              removeExternalStreamTrack(remoteId, kind);
            } else {
              removeRemoteUserStream(remoteId, kind);
            }
          } catch (error) {
            logVoiceError(
              'events: removing stream for closed producer failed',
              error,
              { remoteId, kind, channelId }
            );
          }
        },
        onError: (error) => {
          logVoiceError('events: producer closed subscription error', error);
        }
      }
    );

    const onVoiceUserLeaveSub = trpc.voice.onLeave.subscribe(undefined, {
      onData: ({ channelId, userId }) => {
        if (currentVoiceChannelId !== channelId || isCleaningUp) return;

        logVoice('events: user left voice', { userId, channelId });

        try {
          clearRemoteUserStreamsForUser(userId);
        } catch (error) {
          logVoiceError('events: clearing streams for user failed', error, {
            userId
          });
        }
      },
      onError: (error) => {
        logVoiceError('events: user leave subscription error', error);
      }
    });

    const onVoiceRemoveExternalStreamSub =
      trpc.voice.onRemoveExternalStream.subscribe(undefined, {
        onData: ({ channelId, streamId }) => {
          if (currentVoiceChannelId !== channelId || isCleaningUp) return;

          logVoice('events: external stream removed', {
            streamId,
            channelId
          });

          try {
            removeExternalStream(streamId);
          } catch (error) {
            logVoiceError('events: removing external stream failed', error, {
              streamId,
              channelId
            });
          }
        },
        onError: (error) => {
          logVoiceError('events: external stream subscription error', error);
        }
      });

    return () => {
      logVoice('events: unsubscribing');

      isCleaningUp = true;

      onVoiceNewProducerSub.unsubscribe();
      onVoiceProducerClosedSub.unsubscribe();
      onVoiceUserLeaveSub.unsubscribe();
      onVoiceRemoveExternalStreamSub.unsubscribe();
    };
  }, [
    currentVoiceChannelId,
    ownUserId,
    consume,
    removeRemoteUserStream,
    removeExternalStreamTrack,
    removeExternalStream,
    clearRemoteUserStreamsForUser,
    rtpCapabilitiesRef
  ]);
};

export { useVoiceEvents };
