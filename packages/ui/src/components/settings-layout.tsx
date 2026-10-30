import { ChevronLeft, Menu } from 'lucide-react';
import { memo, useCallback, useState, type ReactNode } from 'react';
import { cn } from '../lib/utils';
import { Button } from './button';
import { IconButton } from './icon-button';
import { SettingsSidebar, type TSettingsEntry } from './settings-sidebar';

type TSettingsLayoutProps = {
  title: string;
  entries: TSettingsEntry[];
  pluginEntries?: TSettingsEntry[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

const NO_ENTRIES: TSettingsEntry[] = [];

const SettingsLayout = memo(
  ({
    title,
    entries,
    pluginEntries = NO_ENTRIES,
    selectedId,
    onSelect,
    onClose,
    children,
    footer
  }: TSettingsLayoutProps) => {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const handleSelect = useCallback(
      (id: string) => {
        setIsDrawerOpen(false);
        onSelect(id);
      },
      [onSelect]
    );

    const toggleDrawer = useCallback(
      () => setIsDrawerOpen((open) => !open),
      []
    );

    const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

    return (
      <div className="flex h-dvh flex-col bg-background text-foreground dark">
        <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
          <Button variant="ghost" size="icon" onClick={onClose}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="flex-1 truncate text-lg font-semibold">{title}</h1>
          <IconButton
            icon={Menu}
            variant="ghost"
            className="md:hidden"
            onClick={toggleDrawer}
          />
        </div>

        <div className="relative flex min-h-0 flex-1">
          {isDrawerOpen && (
            <div
              className="absolute inset-0 z-30 bg-black/50 md:hidden"
              onClick={closeDrawer}
            />
          )}

          <SettingsSidebar
            entries={entries}
            pluginEntries={pluginEntries}
            selectedId={selectedId}
            onSelect={handleSelect}
            className={cn(
              'absolute inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out md:relative md:z-0 md:translate-x-0',
              isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
            )}
          />

          <main className="flex-1 overflow-y-auto">
            <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
              {children}
            </div>

            {footer}
          </main>
        </div>
      </div>
    );
  }
);

export { SettingsLayout };
