import type { TJoinedMessage } from '@sharkord/shared';

type TMessagesGroupComparatorProps = {
  group: TJoinedMessage[];
  disableActions?: boolean;
  disableFiles?: boolean;
  disableReactions?: boolean;
  onReplyMessageSelect?: (message: TJoinedMessage) => void;
  replyTargetMessageId?: number;
};

const groupContainsMessageId = (
  group: TJoinedMessage[],
  messageId: number | undefined
) => {
  if (messageId === undefined) {
    return false;
  }

  return group.some((message) => message.id === messageId);
};

const areGroupsEqual = (
  prevProps: TMessagesGroupComparatorProps,
  nextProps: TMessagesGroupComparatorProps
) => {
  if (
    prevProps.disableActions !== nextProps.disableActions ||
    prevProps.disableFiles !== nextProps.disableFiles ||
    prevProps.disableReactions !== nextProps.disableReactions ||
    prevProps.onReplyMessageSelect !== nextProps.onReplyMessageSelect
  ) {
    return false;
  }

  if (prevProps.group.length !== nextProps.group.length) {
    return false;
  }

  for (let index = 0; index < prevProps.group.length; index += 1) {
    if (prevProps.group[index] !== nextProps.group[index]) {
      return false;
    }
  }

  if (prevProps.replyTargetMessageId === nextProps.replyTargetMessageId) {
    return true;
  }

  const hadReplyTarget = groupContainsMessageId(
    prevProps.group,
    prevProps.replyTargetMessageId
  );

  const hasReplyTarget = groupContainsMessageId(
    nextProps.group,
    nextProps.replyTargetMessageId
  );

  return !hadReplyTarget && !hasReplyTarget;
};

export { areGroupsEqual, groupContainsMessageId };
