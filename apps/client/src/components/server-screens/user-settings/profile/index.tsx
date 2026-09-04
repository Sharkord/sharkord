import { ImagePicker } from '@/components/image-picker';
import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { useSettingsForm } from '@/components/server-screens/settings-shell/use-settings-form';
import { UserAvatar } from '@/components/user-avatar';
import { useOwnPublicUser } from '@/features/server/users/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import type { TPickedImage } from '@/hooks/use-pick-image';
import { getTRPCClient } from '@/lib/trpc';
import { DEFAULT_PROFILE_COLOR } from '@sharkord/shared';
import {
  ColorPicker,
  Group,
  ImageSwatchPicker,
  Input,
  Textarea
} from '@sharkord/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type TProfileValues = {
  name: string;
  profileColor: string;
  bio: string;
  // undefined means untouched, null means remove
  avatar?: TPickedImage | null;
  banner?: TPickedImage | null;
};

const Profile = memo(() => {
  const { t } = useTranslation('settings');
  const ownPublicUser = useOwnPublicUser();

  const onSave = useCallback(async (values: TProfileValues) => {
    const trpc = getTRPCClient();

    await trpc.users.update.mutate({
      name: values.name,
      profileColor: values.profileColor,
      bio: values.bio
    });

    if (values.avatar !== undefined) {
      await trpc.users.changeAvatar.mutate({ fileId: values.avatar?.fileId });
    }

    if (values.banner !== undefined) {
      await trpc.users.changeBanner.mutate({ fileId: values.banner?.fileId });
    }
  }, []);

  const { r, values, onChange } = useSettingsForm<TProfileValues>({
    initialValues: {
      name: ownPublicUser?.name ?? '',
      profileColor: ownPublicUser?.profileColor ?? DEFAULT_PROFILE_COLOR,
      bio: ownPublicUser?.bio ?? ''
    },
    onSave,
    successMessage: t('profileUpdated'),
    errorMessage: t('failedUpdateProfile')
  });

  const handleColorChange = useCallback(
    (color: string) => onChange('profileColor', color),
    [onChange]
  );

  const handleAvatarChange = useCallback(
    (picked: TPickedImage | null) => onChange('avatar', picked),
    [onChange]
  );

  const handleBannerChange = useCallback(
    (picked: TPickedImage | null) => onChange('banner', picked),
    [onChange]
  );

  if (!ownPublicUser) return null;

  const userAvatarUrl =
    values.avatar?.previewUrl ?? getFileUrl(ownPublicUser.avatar);
  const userBannerUrl =
    values.banner?.previewUrl ?? getFileUrl(ownPublicUser.banner);

  return (
    <SettingsSection title={t('profileTitle')} description={t('profileDesc')}>
      <div className="flex flex-wrap items-start gap-4">
        <ImagePicker
          label={t('avatarLabel')}
          className="h-32 w-32 rounded-full"
          currentUrl={getFileUrl(ownPublicUser.avatar)}
          draft={values.avatar}
          onChange={handleAvatarChange}
          fallback={
            <UserAvatar
              userId={ownPublicUser.id}
              className="h-32 w-32 rounded-full bg-muted"
              showStatusBadge={false}
              showUserPopover={false}
            />
          }
        />

        <ImagePicker
          label={t('bannerLabel')}
          className="h-32 w-80"
          currentUrl={getFileUrl(ownPublicUser.banner)}
          draft={values.banner}
          onChange={handleBannerChange}
        />

        <Group label={t('profileColorLabel')}>
          <ColorPicker
            value={values.profileColor}
            onChange={handleColorChange}
            defaultValue={DEFAULT_PROFILE_COLOR}
          />
          <ImageSwatchPicker src={userAvatarUrl} onChange={handleColorChange} />
          <ImageSwatchPicker src={userBannerUrl} onChange={handleColorChange} />
        </Group>
      </div>

      <Group label={t('usernameLabel')}>
        <Input placeholder={t('usernamePlaceholder')} {...r('name')} />
      </Group>

      <Group label={t('bioLabel')}>
        <Textarea placeholder={t('bioPlaceholder')} {...r('bio')} />
      </Group>
    </SettingsSection>
  );
});

export { Profile };
