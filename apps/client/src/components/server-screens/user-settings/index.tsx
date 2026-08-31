import {
  Bell,
  Headphones,
  KeyRound,
  SlidersHorizontal,
  User
} from 'lucide-react';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TServerScreenBaseProps } from '../screens';
import { SettingsShell } from '../settings-shell';
import type { TSettingsEntry } from '../settings-shell/types';
import { Devices } from './devices';
import { Notifications } from './notifications';
import { Others } from './others';
import { Password } from './password';
import { Profile } from './profile';

type TUserSettingsProps = TServerScreenBaseProps;

const UserSettings = memo(({ close }: TUserSettingsProps) => {
  const { t } = useTranslation('settings');

  const entries = useMemo<TSettingsEntry[]>(
    () => [
      {
        id: 'profile',
        label: t('profileTab'),
        icon: User,
        content: <Profile />
      },
      {
        id: 'devices',
        label: t('devicesTab'),
        icon: Headphones,
        content: <Devices />
      },
      {
        id: 'password',
        label: t('passwordTab'),
        icon: KeyRound,
        content: <Password />
      },
      {
        id: 'notifications',
        label: t('notificationsTab'),
        icon: Bell,
        content: <Notifications />
      },
      {
        id: 'others',
        label: t('othersTab'),
        icon: SlidersHorizontal,
        content: <Others />
      }
    ],
    [t]
  );

  return (
    <SettingsShell
      title={t('userSettingsTitle')}
      close={close}
      entries={entries}
    />
  );
});

export { UserSettings };
