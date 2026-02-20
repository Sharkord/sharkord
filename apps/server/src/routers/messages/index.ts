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
import { sendMessageRoute } from './send-message';
import { signalTypingRoute } from './signal-typing';
import { toggleMessageReactionRoute } from './toggle-message-reaction';
import { toggleMessagePinRoute } from './toggle-message-pin';

export const messagesRouter = t.router({
  send: sendMessageRoute,
  edit: editMessageRoute,
  delete: deleteMessageRoute,
  get: getMessagesRoute,
  toggleReaction: toggleMessageReactionRoute,
  togglePin: toggleMessagePinRoute,
  signalTyping: signalTypingRoute,
  onNew: onMessageRoute,
  onUpdate: onMessageUpdateRoute,
  onDelete: onMessageDeleteRoute,
  onTyping: onMessageTypingRoute
});
