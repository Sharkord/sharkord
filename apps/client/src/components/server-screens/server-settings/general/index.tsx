import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Group } from '@/components/ui/group';
import { Input } from '@/components/ui/input';
import { LoadingCard } from '@/components/ui/loading-card';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { closeServerScreens } from '@/features/server-screens/actions';
import { useAdminGeneral } from '@/features/server/admin/hooks';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { LogoManager } from './logo-manager';

const General = memo(() => {
  const { t } = useTranslation();
  const { settings, logo, loading, onChange, submit, errors, refetch } =
    useAdminGeneral();

  if (loading) {
    return <LoadingCard className="h-[600px]" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('serverSettings.general.title')}</CardTitle>
        <CardDescription>
          {t('serverSettings.general.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Group label={t('serverSettings.general.nameLabel')}>
          <Input
            value={settings.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder={t('serverSettings.general.namePlaceholder')}
            error={errors.name}
          />
        </Group>

        <Group label={t('serverSettings.general.descriptionLabel')}>
          <Textarea
            value={settings.description}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder={t('serverSettings.general.descriptionPlaceholder')}
            rows={4}
          />
        </Group>

        <Group label={t('serverSettings.general.passwordLabel')}>
          <Input
            value={settings.password}
            onChange={(e) => onChange('password', e.target.value)}
            placeholder={t('serverSettings.general.passwordPlaceholder')}
            error={errors.password}
          />
        </Group>

        <LogoManager logo={logo} refetch={refetch} />

        <Group
          label={t('serverSettings.general.allowNewUsersLabel')}
          description={t('serverSettings.general.allowNewUsersDescription')}
        >
          <Switch
            checked={settings.allowNewUsers}
            onCheckedChange={(checked) => onChange('allowNewUsers', checked)}
          />
        </Group>

        <Group
          label={t('serverSettings.general.enablePluginsLabel')}
          description={t('serverSettings.general.enablePluginsDescription')}
        >
          <Switch
            checked={settings.enablePlugins}
            onCheckedChange={(checked) => onChange('enablePlugins', checked)}
          />
        </Group>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={closeServerScreens}>
            {t('serverSettings.actions.cancel')}
          </Button>
          <Button onClick={submit} disabled={loading}>
            {t('serverSettings.actions.saveChanges')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export { General };
