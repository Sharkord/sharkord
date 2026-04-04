import { usePluginMetadata } from '@/features/server/plugins/hooks';
import { useUserById } from '@/features/server/users/hooks';
import { getRenderedUsername } from '@/helpers/get-rendered-username';
import type { TMessage } from '@sharkord/shared';

const useMessageAuthorName = (
  message: Pick<TMessage, 'pluginId' | 'userId'>
) => {
  const pluginMetadata = usePluginMetadata(message.pluginId);
  const user = useUserById(message.userId);

  if (pluginMetadata) {
    return pluginMetadata.name ?? message.pluginId ?? 'Unknown Plugin';
  }

  if (user) {
    return getRenderedUsername(user);
  }

  return 'Unknown';
};

export { useMessageAuthorName };
