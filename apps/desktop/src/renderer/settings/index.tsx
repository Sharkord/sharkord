import { SettingsLayout, type TSettingsEntry } from '@sharkord/ui';
import { Keyboard, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { memo, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TDesktopSettings, TSettingsTab } from '../../shared/types';
import { GeneralSettings } from './general-settings';
import { ShortcutsSettings } from './shortcuts-settings';
import { UpdatesSettings } from './updates-settings';

type TSettingsPageProps = {
  settings: TDesktopSettings;
  tab: TSettingsTab;
  onClose: () => void;
};

const SettingsPage = memo(({ settings, tab, onClose }: TSettingsPageProps) => {
  const { t } = useTranslation();
  const [selectedId, setSelectedId] = useState<string>(tab);

  // the main process can open the settings on a tab while they are already showing
  useEffect(() => {
    setSelectedId(tab);
  }, [tab]);

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
      },
      {
        id: 'updates',
        label: t('settings.updates'),
        icon: RefreshCw,
        content: <UpdatesSettings settings={settings} />
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
