import { Settings } from 'lucide-react';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TServerScreenBaseProps } from '../screens';
import { SettingsShell } from '../settings-shell';
import type { TSettingsEntry } from '../settings-shell/types';
import { General } from './general';

type TCategorySettingsProps = TServerScreenBaseProps & {
  categoryId: number;
};

const CategorySettings = memo(
  ({ close, categoryId }: TCategorySettingsProps) => {
    const { t } = useTranslation('settings');

    const entries = useMemo<TSettingsEntry[]>(
      () => [
        {
          id: 'general',
          label: t('generalTab'),
          icon: Settings,
          content: <General categoryId={categoryId} />
        }
      ],
      [t, categoryId]
    );

    return (
      <SettingsShell
        title={t('categorySettingsTitle')}
        close={close}
        entries={entries}
      />
    );
  }
);

export { CategorySettings };
