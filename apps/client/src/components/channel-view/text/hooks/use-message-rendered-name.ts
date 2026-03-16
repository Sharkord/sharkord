import { usePluginMetadata } from '@/features/server/plugins/hooks';
import { useUserById } from '@/features/server/users/hooks';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import type { TMessage } from '@sharkord/shared';

const useMessageRenderedName = (message: TMessage) => {
  const pluginMetadata = usePluginMetadata(message.pluginId);
  const user = useUserById(message.userId);

  if (pluginMetadata) {
    return pluginMetadata.name ?? message.pluginId ?? 'Unknown Plugin';
  }

  if (user) {
    // TODO: check all places where getRenderedUsername is used to see if we can replace it with useMessageRenderedName for consistency
    return getRenderedUsername(user);
  }

  return 'Unknown';
};

export { useMessageRenderedName };
