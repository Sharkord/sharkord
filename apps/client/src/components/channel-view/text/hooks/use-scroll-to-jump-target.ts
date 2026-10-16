import { setMessageJumpTarget } from '@/features/app/actions';
import { useMessageJumpTarget } from '@/features/app/hooks';
import { useEffect, useRef } from 'react';

const DEFAULT_HIGHLIGHT_TIME = 8000;

const useScrollToJumpTarget = (
  channelId: number,
  scrollToMessage: (messageId: number, highlightTime?: number) => Promise<void>
) => {
  const messageJumpTarget = useMessageJumpTarget();
  const isJumpingToMessage = useRef(false);

  useEffect(() => {
    if (
      !messageJumpTarget ||
      messageJumpTarget.channelId !== channelId ||
      isJumpingToMessage.current
    ) {
      return;
    }

    isJumpingToMessage.current = true;

    // use a long timeout here to ensure the message is still highlighted when we scroll to it, even if the user has a lot of messages in the channel and it takes a while to find it and scroll to it
    scrollToMessage(
      messageJumpTarget.messageId,
      messageJumpTarget.highlightTime ?? DEFAULT_HIGHLIGHT_TIME
    ).finally(() => {
      setMessageJumpTarget(undefined);
      isJumpingToMessage.current = false;
    });
  }, [channelId, scrollToMessage, messageJumpTarget]);
};

export { useScrollToJumpTarget };
