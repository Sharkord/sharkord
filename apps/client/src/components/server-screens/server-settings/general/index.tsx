import { ImagePicker } from '@/components/image-picker';
import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { useSettingsForm } from '@/components/server-screens/settings-shell/use-settings-form';
import { useAdminGeneral } from '@/features/server/admin/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import type { TPickedImage } from '@/hooks/use-pick-image';
import { getTRPCClient } from '@/lib/trpc';
import { Group, Input, LoadingCard, Switch, Textarea } from '@sharkord/ui';
import { memo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

type TServerGeneralValues = {
  name: string;
  description: string;
  password: string;
  onlyAskForPasswordOnFirstJoin: boolean;
  allowNewUsers: boolean;
  directMessagesEnabled: boolean;
  enablePlugins: boolean;
  webRtcSimulcastEnabled: boolean;
  enableSearch: boolean;
  showWelcomeDialog: boolean;
  // undefined means untouched, null means remove
  logo?: TPickedImage | null;
};

const INITIAL_VALUES: TServerGeneralValues = {
  name: '',
  description: '',
  password: '',
  onlyAskForPasswordOnFirstJoin: false,
  allowNewUsers: false,
  directMessagesEnabled: true,
  enablePlugins: false,
  webRtcSimulcastEnabled: false,
  enableSearch: true,
  showWelcomeDialog: true
};

const General = memo(() => {
  const { t } = useTranslation('settings');
  const { settings, loading } = useAdminGeneral();

  const onSave = useCallback(async (values: TServerGeneralValues) => {
    const trpc = getTRPCClient();

    await trpc.others.updateSettings.mutate({
      name: values.name,
      description: values.description,
      password: values.password || null,
      onlyAskForPasswordOnFirstJoin: values.onlyAskForPasswordOnFirstJoin,
      allowNewUsers: values.allowNewUsers,
      directMessagesEnabled: values.directMessagesEnabled,
      enablePlugins: values.enablePlugins,
      webRtcSimulcastEnabled: values.webRtcSimulcastEnabled,
      enableSearch: values.enableSearch,
      showWelcomeDialog: values.showWelcomeDialog
    });

    if (values.logo !== undefined) {
      await trpc.others.changeLogo.mutate({ fileId: values.logo?.fileId });
    }
  }, []);

  const { r, values, onChange, reset } = useSettingsForm<TServerGeneralValues>({
    initialValues: INITIAL_VALUES,
    onSave,
    successMessage: t('settingsUpdated'),
    errorMessage: t('failedUpdateSettings')
  });

  useEffect(() => {
    if (!settings) return;

    reset({
      name: settings.name,
      description: settings.description ?? '',
      password: settings.password ?? '',
      onlyAskForPasswordOnFirstJoin:
        settings.onlyAskForPasswordOnFirstJoin ?? false,
      allowNewUsers: settings.allowNewUsers ?? false,
      directMessagesEnabled: settings.directMessagesEnabled ?? true,
      enablePlugins: settings.enablePlugins ?? false,
      webRtcSimulcastEnabled: settings.webRtcSimulcastEnabled ?? false,
      enableSearch: settings.enableSearch ?? true,
      showWelcomeDialog: settings.showWelcomeDialog ?? true
    });
  }, [settings, reset]);

  const handleLogoChange = useCallback(
    (picked: TPickedImage | null) => onChange('logo', picked),
    [onChange]
  );
  const handlePasswordOnFirstJoinChange = useCallback(
    (checked: boolean) => onChange('onlyAskForPasswordOnFirstJoin', checked),
    [onChange]
  );
  const handleAllowNewUsersChange = useCallback(
    (checked: boolean) => onChange('allowNewUsers', checked),
    [onChange]
  );
  const handleEnablePluginsChange = useCallback(
    (checked: boolean) => onChange('enablePlugins', checked),
    [onChange]
  );
  const handleSimulcastChange = useCallback(
    (checked: boolean) => onChange('webRtcSimulcastEnabled', checked),
    [onChange]
  );
  const handleDirectMessagesChange = useCallback(
    (checked: boolean) => onChange('directMessagesEnabled', checked),
    [onChange]
  );
  const handleSearchChange = useCallback(
    (checked: boolean) => onChange('enableSearch', checked),
    [onChange]
  );
  const handleWelcomeDialogChange = useCallback(
    (checked: boolean) => onChange('showWelcomeDialog', checked),
    [onChange]
  );

  if (loading) {
    return <LoadingCard className="h-[600px]" />;
  }

  return (
    <SettingsSection
      title={t('serverInfoTitle')}
      description={t('serverInfoDesc')}
    >
      <Group label={t('nameLabel')}>
        <Input placeholder={t('namePlaceholder')} {...r('name')} />
      </Group>

      <Group label={t('descriptionLabel')}>
        <Textarea
          rows={4}
          placeholder={t('descriptionPlaceholder')}
          {...r('description')}
        />
      </Group>

      <Group label={t('serverPasswordLabel')}>
        <Input
          placeholder={t('serverPasswordPlaceholder')}
          {...r('password', 'password')}
        />
      </Group>

      <Group
        label={t('onlyAskForPasswordOnFirstJoinLabel')}
        description={t('onlyAskForPasswordOnFirstJoinDesc')}
      >
        <Switch
          checked={values.onlyAskForPasswordOnFirstJoin}
          onCheckedChange={handlePasswordOnFirstJoinChange}
        />
      </Group>

      <ImagePicker
        label={t('logoLabel')}
        description={t('logoDesc')}
        className="h-24 w-80 object-scale-down"
        currentUrl={getFileUrl(settings?.logo)}
        draft={values.logo}
        onChange={handleLogoChange}
      />

      <Group
        label={t('allowNewUsersLabel')}
        description={t('allowNewUsersDesc')}
      >
        <Switch
          checked={values.allowNewUsers}
          onCheckedChange={handleAllowNewUsersChange}
        />
      </Group>

      <Group label={t('pluginsLabel')} description={t('pluginsDesc')}>
        <Switch
          checked={values.enablePlugins}
          onCheckedChange={handleEnablePluginsChange}
        />
      </Group>

      <Group label={t('simulcastLabel')} description={t('simulcastDesc')}>
        <Switch
          checked={values.webRtcSimulcastEnabled}
          onCheckedChange={handleSimulcastChange}
        />
      </Group>

      <Group
        label={t('directMessagesEnabledLabel')}
        description={t('directMessagesEnabledDesc')}
      >
        <Switch
          checked={values.directMessagesEnabled}
          onCheckedChange={handleDirectMessagesChange}
        />
      </Group>

      <Group
        label={t('searchEnabledLabel')}
        description={t('searchEnabledDesc')}
      >
        <Switch
          checked={values.enableSearch}
          onCheckedChange={handleSearchChange}
        />
      </Group>

      <Group
        label={t('showWelcomeDialogLabel')}
        description={t('showWelcomeDialogDesc')}
      >
        <Switch
          checked={values.showWelcomeDialog}
          onCheckedChange={handleWelcomeDialogChange}
        />
      </Group>
    </SettingsSection>
  );
});

export { General };
