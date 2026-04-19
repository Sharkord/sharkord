import { closeServerScreens } from '@/features/server-screens/actions';
import { useAdminGeneral } from '@/features/server/admin/hooks';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Group,
  Input,
  LoadingCard,
  Switch,
  Textarea
} from '@sharkord/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { LogoManager } from './logo-manager';

const General = memo(() => {
  const { t } = useTranslation('settings');
  const { settings, logo, loading, onChange, submit, errors, refetch } =
    useAdminGeneral();

  if (loading) {
    return <LoadingCard className="h-[600px]" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('serverInfoTitle')}</CardTitle>
        <CardDescription>{t('serverInfoDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Group label={t('nameLabel')}>
          <Input
            value={settings.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder={t('namePlaceholder')}
            error={errors.name}
          />
        </Group>

        <Group label={t('descriptionLabel')}>
          <Textarea
            value={settings.description}
            onChange={(e) => onChange('description', e.target.value)}
            placeholder={t('descriptionPlaceholder')}
            rows={4}
          />
        </Group>

        <Group label={t('serverPasswordLabel')}>
          <Input
            value={settings.password}
            onChange={(e) => onChange('password', e.target.value)}
            placeholder={t('serverPasswordPlaceholder')}
            error={errors.password}
          />
        </Group>

        <Group
          label={t('onlyAskForPasswordOnFirstJoinLabel')}
          description={t('onlyAskForPasswordOnFirstJoinDesc')}
        >
          <Switch
            checked={settings.onlyAskForPasswordOnFirstJoin}
            onCheckedChange={(checked) =>
              onChange('onlyAskForPasswordOnFirstJoin', checked)
            }
          />
        </Group>

        <LogoManager logo={logo} refetch={refetch} />

        <Group
          label={t('allowNewUsersLabel')}
          description={t('allowNewUsersDesc')}
        >
          <Switch
            checked={settings.allowNewUsers}
            onCheckedChange={(checked) => onChange('allowNewUsers', checked)}
          />
        </Group>

        <Group label={t('pluginsLabel')} description={t('pluginsDesc')}>
          <Switch
            checked={settings.enablePlugins}
            onCheckedChange={(checked) => onChange('enablePlugins', checked)}
          />
        </Group>

        <Group
          label={t('directMessagesEnabledLabel')}
          description={t('directMessagesEnabledDesc')}
        >
          <Switch
            checked={settings.directMessagesEnabled}
            onCheckedChange={(checked) =>
              onChange('directMessagesEnabled', checked)
            }
          />
        </Group>

        <Group
          label={t('searchEnabledLabel')}
          description={t('searchEnabledDesc')}
        >
          <Switch
            checked={settings.enableSearch}
            onCheckedChange={(checked) => onChange('enableSearch', checked)}
          />
        </Group>

        <Group
          label={t('showWelcomeDialogLabel')}
          description={t('showWelcomeDialogDesc')}
        >
          <Switch
            checked={settings.showWelcomeDialog}
            onCheckedChange={(checked) =>
              onChange('showWelcomeDialog', checked)
            }
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
