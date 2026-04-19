import { useCountdown } from '@/hooks/use-countdown';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@sharkord/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { TDialogBaseProps } from '../types';

const COUNTDOWN_SECONDS = 10;

type TPluginInstallConfirmDialogProps = TDialogBaseProps & {
  pluginName: string;
  onConfirm?: () => void;
  onCancel?: () => void;
};

const PluginInstallConfirmDialog = memo(
  ({
    isOpen,
    pluginName,
    onConfirm,
    onCancel,
    close
  }: TPluginInstallConfirmDialogProps) => {
    const { t } = useTranslation('dialogs');
    const { countdown } = useCountdown({
      seconds: COUNTDOWN_SECONDS,
      isActive: isOpen
    });

    const handleCancel = useCallback(() => {
      onCancel?.();
      close();
    }, [onCancel, close]);

    const handleConfirm = useCallback(() => {
      if (countdown > 0) return;
      onConfirm?.();
      close();
    }, [countdown, onConfirm, close]);

    const canConfirm = countdown === 0;

    return (
      <AlertDialog open={isOpen}>
        <AlertDialogContent aria-describedby={undefined}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('pluginInstallConfirmTitle', { name: pluginName })}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="space-y-3">
            <p className="text-sm">{t('pluginInstallConfirmLead')}</p>

            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm space-y-2">
              <p>
                {t('pluginInstallWarningLine1')}{' '}
                <span className="font-semibold text-destructive">
                  {t('pluginInstallWarningHighlight1')}
                </span>
                .
              </p>
              <p>
                {t('pluginInstallWarningLine2')}{' '}
                <span className="font-semibold text-destructive">
                  {t('pluginInstallWarningHighlight2')}
                </span>
                .
              </p>
              <p>
                {t('pluginInstallWarningLine3')}{' '}
                <span className="font-semibold text-destructive">
                  {t('pluginInstallWarningHighlight3')}
                </span>
                .
              </p>
            </div>

            <p className="text-sm text-primary">
              {t('pluginInstallUseDocker')}
            </p>

            <p className="text-sm">
              {t('pluginInstallDocsNote')}{' '}
              <a
                href="https://sharkord.com/docs/plugins/security"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-primary transition-colors"
              >
                https://sharkord.com/docs/plugins/security
              </a>
            </p>
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={handleCancel}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={!canConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {canConfirm
                ? t('pluginInstallConfirmBtn')
                : t('pluginInstallConfirmCountdown', { seconds: countdown })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
);

export { PluginInstallConfirmDialog };
