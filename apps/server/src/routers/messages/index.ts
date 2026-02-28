import { t } from '../../utils/trpc';
import { deleteMessageRoute } from './delete-message';
import { editMessageRoute } from './edit-message';
import {
  onMessageDeleteRoute,
  onMessageRoute,
  onMessageTypingRoute,
  onMessageUpdateRoute,
  onThreadReplyCountUpdateRoute
} from './events';
import { getMessageRoute } from './get-message';
import { getMessagesRoute } from './get-messages';
import { getPinnedRoute } from './get-pinned';
import { getThreadMessagesRoute } from './get-thread-messages';
import { sendMessageRoute } from './send-message';
import { signalTypingRoute } from './signal-typing';
import { toggleMessagePinRoute } from './toggle-message-pin';
import { toggleMessageReactionRoute } from './toggle-message-reaction';

export const messagesRouter = t.router({
  send: sendMessageRoute,
  edit: editMessageRoute,
  delete: deleteMessageRoute,
  get: getMessagesRoute,
  getPinned: getPinnedRoute,
  getOne: getMessageRoute,
  getThread: getThreadMessagesRoute,
  toggleReaction: toggleMessageReactionRoute,
  togglePin: toggleMessagePinRoute,
  signalTyping: signalTypingRoute,
  onNew: onMessageRoute,
  onUpdate: onMessageUpdateRoute,
  onDelete: onMessageDeleteRoute,
  onTyping: onMessageTypingRoute,
  onThreadReplyCountUpdate: onThreadReplyCountUpdateRoute
});
