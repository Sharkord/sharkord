import {
  DESKTOP_SHORTCUTS,
  getDesktopServerShortcut,
  MAX_DESKTOP_SHORTCUT_SERVERS
} from '@sharkord/shared';
import { formatAccelerator, SettingsSection, ShortcutRow } from '@sharkord/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { canToggleMenuBar } from '../platform';

const formatShortcut = (accelerator: string | undefined) =>
  formatAccelerator(accelerator ?? '');

const SERVER_RANGE = `${formatShortcut(getDesktopServerShortcut(0))} … ${formatShortcut(
  getDesktopServerShortcut(MAX_DESKTOP_SHORTCUT_SERVERS - 1)
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
        keys={formatShortcut(DESKTOP_SHORTCUTS.addServer)}
      />
      <ShortcutRow
        label={t('settings.shortcut.toggleServerList')}
        keys={formatShortcut(DESKTOP_SHORTCUTS.toggleServerList)}
      />
      {canToggleMenuBar && (
        <ShortcutRow
          label={t('settings.shortcut.toggleMenuBar')}
          keys={formatShortcut(DESKTOP_SHORTCUTS.toggleMenuBar)}
        />
      )}
      <ShortcutRow
        label={t('settings.shortcut.togglePerformanceOverlay')}
        keys={formatShortcut(DESKTOP_SHORTCUTS.togglePerformanceOverlay)}
      />
    </SettingsSection>
  );
});

export { ShortcutsSettings };
