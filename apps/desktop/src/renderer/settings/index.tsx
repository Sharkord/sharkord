import { SettingsLayout, type TSettingsEntry } from '@sharkord/ui';
import { Keyboard, SlidersHorizontal } from 'lucide-react';
import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TDesktopSettings } from '../../shared/types';
import { GeneralSettings } from './general-settings';
import { ShortcutsSettings } from './shortcuts-settings';

type TSettingsPageProps = {
  settings: TDesktopSettings;
  onClose: () => void;
};

const SettingsPage = memo(({ settings, onClose }: TSettingsPageProps) => {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState('general');

  const entries = useMemo<TSettingsEntry[]>(
    () => [
      {
        id: 'general',
        label: t('settings.general'),
        icon: SlidersHorizontal,
        content: <GeneralSettings settings={settings} />
      },
      {
        id: 'shortcuts',
        label: t('settings.shortcuts'),
        icon: Keyboard,
        content: <ShortcutsSettings />
      }
    ],
    [t, settings]
  );

  const selectedEntry =
    entries.find((entry) => entry.id === selectedId) ?? entries[0];

  return (
    <SettingsLayout
      title={t('settings.title')}
      entries={entries}
      selectedId={selectedEntry.id}
      onSelect={setSelectedId}
      onClose={onClose}
    >
      {selectedEntry.content}
    </SettingsLayout>
  );
});

export { SettingsPage };
