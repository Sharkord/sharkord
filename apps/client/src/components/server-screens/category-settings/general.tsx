import { closeServerScreens } from '@/features/server-screens/actions';
import { useAdminCategoryGeneral } from '@/features/server/admin/hooks';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Group,
  Input
} from '@sharkord/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

type TGeneralProps = {
  categoryId: number;
};

const General = memo(({ categoryId }: TGeneralProps) => {
  const { t } = useTranslation('settings');
  const { category, loading, onChange, submit, errors } =
    useAdminCategoryGeneral(categoryId);

  if (!category) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('categoryInfoTitle')}</CardTitle>
        <CardDescription>{t('categoryInfoDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Group label={t('categoryNameLabel')}>
          <Input
            value={category.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder={t('categoryNamePlaceholder')}
            error={errors.name}
          />
        </Group>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={closeServerScreens}>
            {t('cancel')}
          </Button>
          <Button onClick={submit} disabled={loading}>
            {t('saveChanges')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export { General };
