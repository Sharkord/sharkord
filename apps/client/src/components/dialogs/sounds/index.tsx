import type { TDialogBaseProps } from '@/components/dialogs/types';
import { getSoundTypes, playSound } from '@/features/server/sounds/actions';
import { SoundType } from '@/features/server/types';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Separator
} from '@sharkord/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const soundRows: SoundType[] = getSoundTypes();

const SoundsDialog = memo(({ isOpen, close }: TDialogBaseProps) => {
  const { t } = useTranslation('dialogs');

  const onPlay = useCallback((type: SoundType) => {
    playSound(type);
  }, []);

  return (
    <Dialog open={isOpen}>
      <DialogContent
        className="max-h-[85vh] max-w-3xl overflow-hidden p-0"
        onInteractOutside={close}
        close={close}
      >
        <div className="flex max-h-[85vh] flex-col">
          <DialogHeader className="border-b border-border px-6 py-5 text-left">
            <div className="flex items-center gap-3">
              <DialogTitle>{t('soundsTitle')}</DialogTitle>
            </div>
          </DialogHeader>

          <div className="overflow-y-auto px-6 py-4">
            <div className="space-y-3">
              {soundRows.map((sound, index) => (
                <div key={sound}>
                  <div className="flex items-center justify-between gap-4 py-2">
                    <div className="min-w-0 font-mono text-sm text-muted-foreground">
                      {sound}
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => onPlay(sound)}
                    >
                      {t('playSound')}
                    </Button>
                  </div>

                  {index < soundRows.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
});

export { SoundsDialog };
