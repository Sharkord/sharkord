import {
  isChannelMutedSelector,
  notifyAllMessagesSelector,
  notifyDmsSelector,
  notifyMentionsOnlySelector,
  notifyRepliesSelector,
  selectedThreadSelector,
  threadSidebarDataSelector
} from '@/features/app/selectors';
import { appSliceActions } from '@/features/app/slice';
import { store } from '@/features/store';
import { getFileUrl } from '@/helpers/get-file-url';
import { playSound } from '@/helpers/sounds';
import { i18n } from '@/i18n';
import { notify } from '@/lib/notifications';
import type { TConversation } from '@/types';
import {
  getPlainTextFromHtml,
  hasMention,
  TYPING_MS,
  type TJoinedMessage,
  type TThreadSummary
} from '@sharkord/shared';
import { markChannelAsRead } from '../actions';
import {
  channelByIdSelector,
  isChannelTextVisibleByIdSelector
} from '../channels/selectors';
import { setDirectMessageActivity } from '../dms/actions';
import { getConversationKey, getMessageConversation } from '../helpers';
import { pluginMetadataByIdSelector } from '../plugins/selectors';
import { isThreadOpenSelector } from '../selectors';
import { serverSliceActions } from '../slice';
import { isThreadFollowedSelector } from '../threads/selectors';
import { SoundType } from '../types';
import {
  ownUserIdSelector,
  ownUserRoleIdsSelector,
  userByIdSelector
} from '../users/selectors';

const sendMessageNotification = (
  message: TJoinedMessage,
  channelId: number,
  isDm = false
) => {
  const state = store.getState();

  const user = userByIdSelector(state, message.userId);
  const plugin = pluginMetadataByIdSelector(state, message.pluginId);
  const channel = channelByIdSelector(state, channelId);
  const isPluginMessage = !!message.pluginId;

  if (!user || !channel) {
    return;
  }

  const authorName = isPluginMessage && plugin ? plugin.name : user.name;
  const textContent = getPlainTextFromHtml(message.content ?? '');

  const title = isDm
    ? i18n.t('common:notificationTitleDm', { author: authorName })
    : i18n.t('common:notificationTitleChannel', {
        author: authorName,
        channel: channel.name
      });

  const body = textContent
    ? textContent
    : i18n.t('common:notificationSentAttachment');
  const icon = user.avatar ? getFileUrl(user.avatar) : undefined;

  notify({
    title,
    body,
    icon,
    target: {
      type: 'message',
      channelId,
      messageId: message.id,
      parentMessageId: message.parentMessageId ?? undefined,
      isDm
    }
  });
};

const typingTimeouts: { [key: string]: NodeJS.Timeout } = {};

export const setConversationMessages = (
  conversation: TConversation,
  messages: TJoinedMessage[],
  detached: boolean
) => {
  store.dispatch(
    serverSliceActions.setConversationMessages({
      conversationKey: getConversationKey(conversation),
      messages,
      detached
    })
  );
};

export const trimConversationMessages = (conversation: TConversation) => {
  store.dispatch(
    serverSliceActions.trimConversationMessages(
      getConversationKey(conversation)
    )
  );
};

// every message passed belongs to the conversation, a page or a single live message
export const addMessages = (
  conversation: TConversation,
  messages: TJoinedMessage[],
  isSubscriptionMessage = false
) => {
  const { channelId } = conversation;

  store.dispatch(
    serverSliceActions.addMessages({
      conversationKey: getConversationKey(conversation),
      messages,
      isLive: isSubscriptionMessage
    })
  );

  messages.forEach((message) => {
    if (message.userId) {
      removeTypingUser(conversation, message.userId);
    }
  });

  if (isSubscriptionMessage && messages.length > 0) {
    const state = store.getState();
    const ownUserId = ownUserIdSelector(state);
    const notifiesAllMessages = notifyAllMessagesSelector(state);
    const notificationsForMentionsOnly = notifyMentionsOnlySelector(state);
    const targetMessage = messages[0];
    const isFromOwnUser =
      targetMessage.userId && ownUserId === targetMessage.userId;

    const isChannelTextVisible = isChannelTextVisibleByIdSelector(
      state,
      channelId
    );

    const isWindowHidden = document?.hidden;
    const isChannelMuted = isChannelMutedSelector(state, channelId);
    const channel = channelByIdSelector(state, channelId);
    const isDmChannel = !!channel?.isDm;

    if (isDmChannel) {
      setDirectMessageActivity(channelId, targetMessage.createdAt);
    }
    const ownRoleIds = ownUserRoleIdsSelector(state);

    const threadParentId = targetMessage.parentMessageId;
    const isThreadReply = !!threadParentId;
    const isThreadOpen =
      !!threadParentId && isThreadOpenSelector(state, threadParentId);
    const isFollowedThread =
      !!threadParentId && isThreadFollowedSelector(state, threadParentId);
    const isMentioned = hasMention(
      targetMessage.content ?? null,
      ownUserId,
      ownRoleIds
    );

    // replies in threads the user does not follow stay quiet. a mention counts on its own,
    // in case the reply lands before the event that makes the user follow its thread
    const isNotifiable = !isThreadReply || isFollowedThread || isMentioned;

    // a thread reply is only on screen while its thread is open, seeing the channel is not enough
    const isMessageOnScreen =
      (isThreadReply ? isThreadOpen : isChannelTextVisible) && !isWindowHidden;

    if (!isFromOwnUser && !isChannelMuted) {
      if (isNotifiable || isThreadOpen) {
        playSound(SoundType.MESSAGE_RECEIVED);
      }

      if (isNotifiable && !isMessageOnScreen) {
        const hasDmNotificationsEnabled = notifyDmsSelector(state);
        const hasRepliesNotificationsEnabled = notifyRepliesSelector(state);

        if (isDmChannel && hasDmNotificationsEnabled) {
          sendMessageNotification(targetMessage, channelId, true);
        } else if (notificationsForMentionsOnly) {
          if (isMentioned) {
            sendMessageNotification(targetMessage, channelId);
          }
        } else if (notifiesAllMessages) {
          sendMessageNotification(targetMessage, channelId);
        } else if (hasRepliesNotificationsEnabled) {
          const isReplyToOwnMessage =
            !!targetMessage.replyToMessageId &&
            targetMessage.replyTo?.userId === ownUserId;

          if (isReplyToOwnMessage) {
            sendMessageNotification(targetMessage, channelId);
          }
        }
      }
    }

    if (isChannelTextVisible && !isFromOwnUser && !isThreadReply) {
      markChannelAsRead(channelId, true);
    }
  }
};

export const updateMessage = (message: TJoinedMessage) => {
  store.dispatch(
    serverSliceActions.updateMessage({
      conversationKey: getConversationKey(getMessageConversation(message)),
      message
    })
  );
};

export const deleteMessage = (
  conversation: TConversation,
  messageId: number
) => {
  store.dispatch(serverSliceActions.deleteMessage({ conversation, messageId }));

  const state = store.getState();
  const threadSidebar = threadSidebarDataSelector(state);
  const selectedThread = selectedThreadSelector(state);

  if (threadSidebar.parentMessageId === messageId) {
    store.dispatch(
      appSliceActions.setThreadSidebarOpen({
        open: false,
        parentMessageId: undefined,
        channelId: undefined
      })
    );
  }

  if (selectedThread?.parentMessageId === messageId) {
    store.dispatch(appSliceActions.setSelectedThread(undefined));
  }
};

export const removeTypingUser = (
  conversation: TConversation,
  userId: number
) => {
  store.dispatch(
    serverSliceActions.removeTypingUser({
      conversationKey: getConversationKey(conversation),
      userId
    })
  );
};

export const addTypingUser = (conversation: TConversation, userId: number) => {
  const conversationKey = getConversationKey(conversation);
  const timeoutKey = `${conversationKey}-${userId}`;

  store.dispatch(serverSliceActions.addTypingUser({ conversationKey, userId }));

  if (typingTimeouts[timeoutKey]) {
    clearTimeout(typingTimeouts[timeoutKey]);
  }

  typingTimeouts[timeoutKey] = setTimeout(() => {
    removeTypingUser(conversation, userId);

    delete typingTimeouts[timeoutKey];
  }, TYPING_MS + 500);
};

export const updateThreadSummary = (
  channelId: number,
  messageId: number,
  summary: TThreadSummary
) => {
  store.dispatch(
    serverSliceActions.updateThreadSummary({
      channelId,
      messageId,
      ...summary
    })
  );
};
