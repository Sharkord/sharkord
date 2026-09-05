import { loadMessage } from '../../helpers/load-message-for-write';
import { setMessagePinned } from '../../helpers/message-pin';

const PLUGIN_ACTOR = null;

const setPluginMessagePinned = async (messageId: number, pinned: boolean) => {
  const message = await loadMessage(messageId);

  await setMessagePinned(message, pinned, PLUGIN_ACTOR);
};

export { setPluginMessagePinned };
