import type { TJoinedMessage } from '@sharkord/shared';

// static values for ChatInputDivider component
const MAX_VH = 80;
const MIN_PX = 56;
const RESET_THRESHOLD_PX = 10;
const DEFAULT_MAX_HEIGHT_VH = 35;

type TMessagesGroupComparatorProps = {
  group: TJoinedMessage[];
  disableActions?: boolean;
  disableFiles?: boolean;
  disableReactions?: boolean;
  onReplyMessageSelect?: (message: TJoinedMessage) => void;
  replyTargetMessageId?: number;
  activeThreadMessageId?: number;
  editingMessageId?: number;
  onEditComplete?: () => void;
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
  const editingUnchanged =
    prevProps.editingMessageId === nextProps.editingMessageId;

  if (replyTargetUnchanged && activeThreadUnchanged && editingUnchanged) {
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
  const isEditingChangeRelevant = !editingUnchanged
    ? groupContainsMessageId(prevProps.group, prevProps.editingMessageId) ||
      groupContainsMessageId(nextProps.group, nextProps.editingMessageId)
    : false;

  return (
    !isReplyTargetChangeRelevant &&
    !isActiveThreadChangeRelevant &&
    !isEditingChangeRelevant
  );
};

// calculate the minimum acceptable chat input height
const measureMinHeight = (composeEl: HTMLDivElement): number => {
  const proseMirror = composeEl.querySelector('.ProseMirror');

  if (!proseMirror) return MIN_PX;

  // clamp to one line to measure empty state
  const savedHeight = composeEl.style.height;
  const savedMaxHeight = composeEl.style.maxHeight;
  const scrollRow = composeEl.querySelector('.compose-scroll-row');

  const savedScrollTop = scrollRow?.scrollTop ?? 0;

  proseMirror.classList.add('line-clamp-1');

  composeEl.style.height = '';
  composeEl.style.maxHeight = '';

  const minHeight = getHeight(composeEl);

  // restore height and scroll position
  composeEl.style.height = savedHeight;
  composeEl.style.maxHeight = savedMaxHeight;

  proseMirror.classList.remove('line-clamp-1');

  if (scrollRow) scrollRow.scrollTop = savedScrollTop;

  return Math.max(MIN_PX, minHeight);
};

const getHeight = (el: HTMLElement) => el.getBoundingClientRect().height;

export {
  areGroupsEqual,
  DEFAULT_MAX_HEIGHT_VH,
  getHeight,
  groupContainsMessageId,
  MAX_VH,
  measureMinHeight,
  MIN_PX,
  RESET_THRESHOLD_PX
};
