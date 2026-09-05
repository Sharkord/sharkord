import { Settings, Shield } from 'lucide-react';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TServerScreenBaseProps } from '../screens';
import { SettingsShell } from '../settings-shell';
import type { TSettingsEntry } from '../settings-shell/types';
import { General } from './general';
import { ChannelPermissions } from './permissions';

type TChannelSettingsProps = TServerScreenBaseProps & {
  channelId: number;
};

const ChannelSettings = memo(({ close, channelId }: TChannelSettingsProps) => {
  const { t } = useTranslation('settings');

  const entries = useMemo<TSettingsEntry[]>(
    () => [
      {
        id: 'general',
        label: t('generalTab'),
        icon: Settings,
        content: <General channelId={channelId} />
      },
      {
        id: 'permissions',
        label: t('permissionsTab'),
        icon: Shield,
        content: <ChannelPermissions channelId={channelId} />
      }
    ],
    [t, channelId]
  );

  return (
    <SettingsShell
      title={t('channelSettingsTitle')}
      close={close}
      entries={entries}
    />
  );
});

export { ChannelSettings };
