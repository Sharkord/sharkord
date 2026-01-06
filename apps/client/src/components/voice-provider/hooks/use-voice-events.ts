import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { useOwnUserId } from '@/features/server/users/hooks';
import { logVoice } from '@/helpers/browser-logger';
import { getTRPCClient } from '@/lib/trpc';
import type { StreamKind } from '@sharkord/shared';
import type { RtpCapabilities } from 'mediasoup-client/types';
import { useEffect } from 'react';

type TEvents = {
  consume: (
    remoteUserId: number,
    kind: StreamKind,
    routerRtpCapabilities: RtpCapabilities
  ) => Promise<void>;
  removeRemoteStream: (userId: number, kind: StreamKind) => void;
  clearRemoteStreamsForUser: (userId: number) => void;
  rtpCapabilities: RtpCapabilities;
};

const useVoiceEvents = ({
  consume,
  removeRemoteStream,
  clearRemoteStreamsForUser,
  rtpCapabilities
}: TEvents) => {
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const ownUserId = useOwnUserId();

  useEffect(() => {
    if (!currentVoiceChannelId) {
      logVoice('Voice events not initialized - missing channelId');
      return;
    }

    const trpc = getTRPCClient();
    let isCleaningUp = false;

    const onVoiceNewProducerSub = trpc.voice.onNewProducer.subscribe(
      undefined,
      {
        onData: ({ remoteUserId, kind, channelId }) => {
          if (currentVoiceChannelId !== channelId || isCleaningUp) return;

          if (remoteUserId === ownUserId) {
            logVoice('Ignoring own producer event', {
              remoteUserId,
              ownUserId,
              kind,
              channelId
            });

            return;
          }

          logVoice('New producer event received', {
            remoteUserId,
            kind,
            channelId
          });

          try {
            consume(remoteUserId, kind, rtpCapabilities);
          } catch (error) {
            logVoice('Error consuming new producer', {
              error,
              remoteUserId,
              kind,
              channelId
            });
          }
        },
        onError: (error) => {
          logVoice('onVoiceNewProducer subscription error', { error });
        }
      }
    );

    const onVoiceProducerClosedSub = trpc.voice.onProducerClosed.subscribe(
      undefined,
      {
        onData: ({ channelId, remoteUserId, kind }) => {
          if (currentVoiceChannelId !== channelId || isCleaningUp) return;

          logVoice('Producer closed event received', {
            remoteUserId,
            kind,
            channelId
          });

          try {
            removeRemoteStream(remoteUserId, kind);
          } catch (error) {
            logVoice('Error removing remote stream for closed producer', {
              error,
              remoteUserId,
              kind,
              channelId
            });
          }
        },
        onError: (error) => {
          logVoice('onVoiceProducerClosed subscription error', { error });
        }
      }
    );

    const onVoiceUserLeaveSub = trpc.voice.onLeave.subscribe(undefined, {
      onData: ({ channelId, userId }) => {
        if (currentVoiceChannelId !== channelId || isCleaningUp) return;

        logVoice('User leave event received', { userId, channelId });

        try {
          clearRemoteStreamsForUser(userId);
        } catch (error) {
          logVoice('Error clearing remote streams for user', { error });
        }
      },
      onError: (error) => {
        logVoice('onVoiceUserLeave subscription error', { error });
      }
    });

    return () => {
      logVoice('Cleaning up voice events');

      isCleaningUp = true;

      onVoiceNewProducerSub.unsubscribe();
      onVoiceProducerClosedSub.unsubscribe();
      onVoiceUserLeaveSub.unsubscribe();
    };
  }, [
    currentVoiceChannelId,
    ownUserId,
    consume,
    removeRemoteStream,
    clearRemoteStreamsForUser,
    rtpCapabilities
  ]);
};

export { useVoiceEvents };
