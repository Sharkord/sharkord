import { SettingsSection, ShortcutRow } from '@sharkord/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getServerShortcut,
  MAX_SHORTCUT_SERVERS,
  SHORTCUTS
} from '../../shared/shortcuts';
import { canToggleMenuBar, isMac } from '../platform';

const formatShortcut = (accelerator: string | undefined) =>
  (accelerator ?? '').replace('CmdOrCtrl', isMac ? '⌘' : 'Ctrl');

const SERVER_RANGE = `${formatShortcut(getServerShortcut(0))} … ${formatShortcut(
  getServerShortcut(MAX_SHORTCUT_SERVERS - 1)
)}`;

const ShortcutsSettings = memo(() => {
  const { t } = useTranslation();

  return (
    <SettingsSection
      title={t('settings.shortcuts')}
      description={t('settings.shortcutsDescription')}
    >
      <ShortcutRow
        label={t('settings.shortcut.selectServer')}
        keys={SERVER_RANGE}
      />
      <ShortcutRow
        label={t('settings.shortcut.addServer')}
        keys={formatShortcut(SHORTCUTS.addServer)}
      />
      <ShortcutRow
        label={t('settings.shortcut.toggleServerList')}
        keys={formatShortcut(SHORTCUTS.toggleServerList)}
      />
      {canToggleMenuBar && (
        <ShortcutRow
          label={t('settings.shortcut.toggleMenuBar')}
          keys={formatShortcut(SHORTCUTS.toggleMenuBar)}
        />
      )}
      <ShortcutRow
        label={t('settings.shortcut.togglePerformanceOverlay')}
        keys={formatShortcut(SHORTCUTS.togglePerformanceOverlay)}
      />
    </SettingsSection>
  );
});

export { ShortcutsSettings };
