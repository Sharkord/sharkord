import { ScreenShareSettings } from '@/components/screen-share-settings';
import type { TDeviceSettings } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AutoFocus,
  DetailsSection,
  Label,
  Switch
} from '@sharkord/ui';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TDialogBaseProps } from '../types';

type TScreenShareOptionsDialogProps = TDialogBaseProps & {
  settings: TDeviceSettings;
  onConfirm: (settings: TDeviceSettings) => void;
  onCancel: () => void;
};

const ScreenShareOptionsDialog = memo(
  ({
    isOpen,
    settings,
    onConfirm,
    onCancel
  }: TScreenShareOptionsDialogProps) => {
    const { t } = useTranslation('dialogs');
    const [values, setValues] = useState(settings);

    const handleChange = useCallback(
      <K extends keyof TDeviceSettings>(key: K, value: TDeviceSettings[K]) => {
        setValues((previous) => ({ ...previous, [key]: value }));
      },
      []
    );

    const handleShareSystemAudioChange = useCallback(
      (checked: boolean) => handleChange('shareSystemAudio', checked),
      [handleChange]
    );

    const handleConfirm = useCallback(() => {
      onConfirm(values);
    }, [onConfirm, values]);

    return (
      <AlertDialog open={isOpen}>
        <AlertDialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('screenShareTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('screenShareMessage')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-2">
            <Switch
              id="share-system-audio"
              checked={values.shareSystemAudio}
              onCheckedChange={handleShareSystemAudioChange}
            />
            <Label htmlFor="share-system-audio">{t('shareSystemAudio')}</Label>
          </div>
          <DetailsSection title={t('additionalScreenShareSettings')}>
            <ScreenShareSettings values={values} onChange={handleChange} />
          </DetailsSection>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={onCancel}>
              {t('cancel')}
            </AlertDialogCancel>
            <AutoFocus>
              <AlertDialogAction onClick={handleConfirm}>
                {t('screenShareConfirm')}
              </AlertDialogAction>
            </AutoFocus>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
);

export { ScreenShareOptionsDialog };
