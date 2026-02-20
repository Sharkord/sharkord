import { t } from '../../utils/trpc';
import { deleteMessageRoute } from './delete-message';
import { editMessageRoute } from './edit-message';
import {
  onMessageDeleteRoute,
  onMessageRoute,
  onMessageTypingRoute,
  onMessageUpdateRoute
} from './events';
import { getMessagesRoute } from './get-messages';
import { getThreadMessagesRoute } from './get-thread-messages';
import { sendMessageRoute } from './send-message';
import { signalTypingRoute } from './signal-typing';
import { toggleMessageReactionRoute } from './toggle-message-reaction';

export const messagesRouter = t.router({
  send: sendMessageRoute,
  edit: editMessageRoute,
  delete: deleteMessageRoute,
  get: getMessagesRoute,
  getThread: getThreadMessagesRoute,
  toggleReaction: toggleMessageReactionRoute,
  signalTyping: signalTypingRoute,
  onNew: onMessageRoute,
  onUpdate: onMessageUpdateRoute,
  onDelete: onMessageDeleteRoute,
  onTyping: onMessageTypingRoute
});
