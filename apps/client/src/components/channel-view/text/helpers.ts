import type { TJoinedMessage } from '@sharkord/shared';

type TMessagesGroupComparatorProps = {
  group: TJoinedMessage[];
  disableActions?: boolean;
  disableFiles?: boolean;
  disableReactions?: boolean;
  onReplyMessageSelect?: (message: TJoinedMessage) => void;
  replyTargetMessageId?: number;
  activeThreadMessageId?: number;
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

  const replyTargetUnchanged =
    prevProps.replyTargetMessageId === nextProps.replyTargetMessageId;
  const activeThreadUnchanged =
    prevProps.activeThreadMessageId === nextProps.activeThreadMessageId;

  if (replyTargetUnchanged && activeThreadUnchanged) {
    return true;
  }

  const isReplyTargetChangeRelevant = !replyTargetUnchanged
    ? groupContainsMessageId(prevProps.group, prevProps.replyTargetMessageId) ||
      groupContainsMessageId(nextProps.group, nextProps.replyTargetMessageId)
    : false;
  const isActiveThreadChangeRelevant = !activeThreadUnchanged
    ? groupContainsMessageId(
        prevProps.group,
        prevProps.activeThreadMessageId
      ) ||
      groupContainsMessageId(nextProps.group, nextProps.activeThreadMessageId)
    : false;

  return !isReplyTargetChangeRelevant && !isActiveThreadChangeRelevant;
};

export { areGroupsEqual, groupContainsMessageId };
