import { getTRPCClient } from '@/lib/trpc';
import { TYPING_MS } from '@sharkord/shared';
import { throttle } from 'lodash-es';
import { useMemo } from 'react';

const useTypingSignal = (channelId: number, parentMessageId?: number) =>
  useMemo(
    () =>
      throttle(async () => {
        const trpc = getTRPCClient();

        try {
          await trpc.messages.signalTyping.mutate({
            channelId,
            parentMessageId
          });
        } catch {
          // ignore
        }
      }, TYPING_MS),
    [channelId, parentMessageId]
  );

export { useTypingSignal };
