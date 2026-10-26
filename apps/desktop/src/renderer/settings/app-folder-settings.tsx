import { IconButton, SettingsSection } from '@sharkord/ui';
import { FolderOpen } from 'lucide-react';
import { memo, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const AppFolderSettings = memo(() => {
  const { t } = useTranslation();
  const [folder, setFolder] = useState('');

  useEffect(() => {
    let active = true;

    const load = async () => {
      const path = await window.desktop.getAppFolder();

      if (active) {
        setFolder(path);
      }
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  const handleOpen = useCallback(() => {
    window.desktop.openAppFolder();
  }, []);

  return (
    <SettingsSection
      title={t('settings.appFolder')}
      description={t('settings.appFolderDescription')}
    >
      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-md border bg-muted px-3 py-2 font-mono text-sm">
          {folder}
        </code>
        <IconButton
          variant="ghost"
          icon={FolderOpen}
          title={t('settings.openAppFolder')}
          onClick={handleOpen}
        />
      </div>
    </SettingsSection>
  );
});

export { AppFolderSettings };
