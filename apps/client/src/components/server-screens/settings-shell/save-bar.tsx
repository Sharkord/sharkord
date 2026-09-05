import { Button, Spinner } from '@sharkord/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

type TSaveBarProps = {
  isSaving: boolean;
  save: () => Promise<void>;
};

const SaveBar = memo(({ isSaving, save }: TSaveBarProps) => {
  const { t } = useTranslation('settings');

  return (
    <div className="pointer-events-none sticky bottom-4 z-20 px-4 md:px-6">
      <div className="pointer-events-auto mx-auto flex max-w-4xl items-center justify-between gap-4 rounded-xl border bg-card px-4 py-3 shadow-lg">
        <span className="text-sm font-medium">{t('unsavedChanges')}</span>
        <Button onClick={save} disabled={isSaving}>
          {isSaving && <Spinner size="xxs" />}
          {isSaving ? t('saving') : t('saveChanges')}
        </Button>
      </div>
    </div>
  );
});

export { SaveBar };
