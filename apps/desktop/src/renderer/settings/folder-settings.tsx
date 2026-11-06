import { IconButton, SettingsSection } from '@sharkord/ui';
import { FolderOpen } from 'lucide-react';
import { memo, useEffect, useState } from 'react';

type TFolderSettingsProps = {
  title: string;
  description: string;
  openLabel: string;
  getFolder: () => Promise<string>;
  onOpen: () => void;
};

const FolderSettings = memo(
  ({
    title,
    description,
    openLabel,
    getFolder,
    onOpen
  }: TFolderSettingsProps) => {
    const [folder, setFolder] = useState('');

    useEffect(() => {
      let active = true;

      const load = async () => {
        const path = await getFolder();

        if (active) {
          setFolder(path);
        }
      };

      load();

      return () => {
        active = false;
      };
    }, [getFolder]);

    return (
      <SettingsSection title={title} description={description}>
        <div className="flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-md border bg-muted px-3 py-2 font-mono text-sm">
            {folder}
          </code>
          <IconButton
            variant="ghost"
            icon={FolderOpen}
            title={openLabel}
            onClick={onOpen}
          />
        </div>
      </SettingsSection>
    );
  }
);

export { FolderSettings };
