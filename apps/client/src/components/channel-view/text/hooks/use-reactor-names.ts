import { usePluginNames } from '@/features/server/plugins/hooks';
import { useUsernames } from '@/features/server/users/hooks';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const MAX_REACTORS_PREVIEW = 4;

const useReactorNames = (userIds: number[], pluginIds: string[]) => {
  const { t } = useTranslation('common');
  const usernames = useUsernames();
  const pluginNames = usePluginNames();

  return useMemo(() => {
    const reactors = [
      ...userIds.map((userId) => usernames[userId] || 'Unknown'),
      ...pluginIds.map((pluginId) => pluginNames[pluginId] ?? pluginId)
    ];

    const names = reactors.slice(0, MAX_REACTORS_PREVIEW);

    if (reactors.length > MAX_REACTORS_PREVIEW) {
      names.push(
        t('andMore', { count: reactors.length - MAX_REACTORS_PREVIEW })
      );
    }

    return names.join(', ');
  }, [userIds, pluginIds, usernames, pluginNames, t]);
};

export { useReactorNames };
