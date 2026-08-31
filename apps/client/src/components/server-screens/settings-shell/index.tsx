import { useModViewOpen } from '@/features/app/hooks';
import { requestConfirmation } from '@/features/dialogs/actions';
import { useDialogInfo } from '@/features/dialogs/hooks';
import { usePreventExit } from '@/hooks/use-prevent-exit';
import { cn } from '@/lib/utils';
import { Button, IconButton } from '@sharkord/ui';
import { ChevronLeft, Menu } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SettingsFormContext, type TSettingsFormHandle } from './context';
import { SaveBar } from './save-bar';
import { SettingsSidebar } from './sidebar';
import type { TSettingsEntry } from './types';

type TSettingsShellProps = {
  title: string;
  close: () => void;
  entries: TSettingsEntry[];
  pluginEntries?: TSettingsEntry[];
};

const NO_ENTRIES: TSettingsEntry[] = [];

const SettingsShell = memo(
  ({
    title,
    close,
    entries,
    pluginEntries = NO_ENTRIES
  }: TSettingsShellProps) => {
    const { t } = useTranslation('settings');
    const [selectedId, setSelectedId] = useState(() => entries[0]?.id ?? '');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [form, setForm] = useState<TSettingsFormHandle | null>(null);
    const { isOpen: isModViewOpen } = useModViewOpen();
    const { isOpen: isDialogOpen } = useDialogInfo();

    usePreventExit(form?.isDirty);

    const allEntries = useMemo(
      () => [...entries, ...pluginEntries],
      [entries, pluginEntries]
    );

    const selectedEntry =
      allEntries.find((entry) => entry.id === selectedId) ?? allEntries[0];

    const confirmLeave = useCallback(async () => {
      if (!form?.isDirty) return true;

      return requestConfirmation({
        title: t('discardChangesTitle'),
        message: t('discardChangesMsg'),
        confirmLabel: t('discardChangesBtn'),
        variant: 'danger'
      });
    }, [form?.isDirty, t]);

    const handleClose = useCallback(async () => {
      if (await confirmLeave()) close();
    }, [confirmLeave, close]);

    const handleSelect = useCallback(
      async (id: string) => {
        if (id === selectedId) {
          setIsDrawerOpen(false);
          return;
        }

        if (!(await confirmLeave())) return;

        setForm(null);
        setSelectedId(id);
        setIsDrawerOpen(false);
      },
      [confirmLeave, selectedId]
    );

    const toggleDrawer = useCallback(
      () => setIsDrawerOpen((open) => !open),
      []
    );
    const closeDrawer = useCallback(() => setIsDrawerOpen(false), []);

    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key !== 'Escape') return;

        // the topmost surface owns escape: a dialog or the mod view closes itself first
        if (isModViewOpen || isDialogOpen) return;

        handleClose();
      };

      document.addEventListener('keydown', handleKeyDown);

      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleClose, isModViewOpen, isDialogOpen]);

    return (
      <SettingsFormContext.Provider value={setForm}>
        <div className="flex h-dvh flex-col bg-background text-foreground dark">
          <div className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
            <Button variant="ghost" size="icon" onClick={handleClose}>
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
              selectedId={selectedEntry?.id ?? ''}
              onSelect={handleSelect}
              className={cn(
                'absolute inset-y-0 left-0 z-40 transition-transform duration-300 ease-in-out md:relative md:z-0 md:translate-x-0',
                isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
              )}
            />

            <main className="flex-1 overflow-y-auto">
              <div className="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
                {selectedEntry?.content}
              </div>

              {form?.isDirty && (
                <SaveBar isSaving={form.isSaving} save={form.save} />
              )}
            </main>
          </div>
        </div>
      </SettingsFormContext.Provider>
    );
  }
);

export { SettingsShell };
