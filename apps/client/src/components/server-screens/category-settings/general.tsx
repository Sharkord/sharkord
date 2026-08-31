import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { useSettingsForm } from '@/components/server-screens/settings-shell/use-settings-form';
import { useAdminCategoryGeneral } from '@/features/server/admin/hooks';
import { getTRPCClient } from '@/lib/trpc';
import { Group, Input, LoadingCard } from '@sharkord/ui';
import { memo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

type TGeneralProps = {
  categoryId: number;
};

type TCategoryValues = {
  name: string;
};

const General = memo(({ categoryId }: TGeneralProps) => {
  const { t } = useTranslation('settings');
  const { category, loading } = useAdminCategoryGeneral(categoryId);

  const onSave = useCallback(
    async (values: TCategoryValues) => {
      const trpc = getTRPCClient();

      await trpc.categories.update.mutate({ categoryId, name: values.name });
    },
    [categoryId]
  );

  const { r, reset } = useSettingsForm<TCategoryValues>({
    initialValues: { name: '' },
    onSave,
    successMessage: t('categoryUpdated'),
    errorMessage: t('failedUpdateCategory')
  });

  useEffect(() => {
    if (category) reset({ name: category.name });
  }, [category, reset]);

  if (loading) {
    return <LoadingCard className="h-64" />;
  }

  return (
    <SettingsSection
      title={t('categoryInfoTitle')}
      description={t('categoryInfoDesc')}
    >
      <Group label={t('categoryNameLabel')}>
        <Input placeholder={t('categoryNamePlaceholder')} {...r('name')} />
      </Group>
    </SettingsSection>
  );
});

export { General };
