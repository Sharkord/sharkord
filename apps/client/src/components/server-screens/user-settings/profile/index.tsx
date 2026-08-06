import { closeServerScreens } from '@/features/server-screens/actions';
import { useOwnPublicUser } from '@/features/server/users/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import { useForm } from '@/hooks/use-form';
import { getTRPCClient } from '@/lib/trpc';
import { DEFAULT_PROFILE_COLOR } from '@sharkord/shared';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ColorPicker,
  Group,
  ImageSwatchPicker,
  Input,
  Textarea
} from '@sharkord/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AvatarManager } from './avatar-manager';
import { BannerManager } from './banner-manager';

const Profile = memo(() => {
  const { t } = useTranslation('settings');
  const ownPublicUser = useOwnPublicUser();
  const { setTrpcErrors, r, values, onChange } = useForm({
    name: ownPublicUser?.name ?? '',
    profileColor: ownPublicUser?.profileColor ?? DEFAULT_PROFILE_COLOR,
    bio: ownPublicUser?.bio ?? ''
  });

  const handleColorChange = useCallback(
    (color: string) => {
      onChange('profileColor', color);
    },
    [onChange]
  );

  const onUpdateUser = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      await trpc.users.update.mutate(values);
      toast.success(t('profileUpdated'));
    } catch (error) {
      setTrpcErrors(error);
    }
  }, [values, setTrpcErrors, t]);

  if (!ownPublicUser) return null;

  const userAvatarUrl = getFileUrl(ownPublicUser.avatar);
  const userBannerUrl = getFileUrl(ownPublicUser.banner);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('profileTitle')}</CardTitle>
        <CardDescription>{t('profileDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-start gap-4">
          <AvatarManager user={ownPublicUser} />

          <BannerManager user={ownPublicUser} />

          <Group label={t('profileColorLabel')}>
            <ColorPicker
              value={values.profileColor}
              onChange={handleColorChange}
              defaultValue={DEFAULT_PROFILE_COLOR}
            />
            <ImageSwatchPicker
              src={userAvatarUrl}
              onChange={handleColorChange}
            />
            <ImageSwatchPicker
              src={userBannerUrl}
              onChange={handleColorChange}
            />
          </Group>
        </div>

        <Group label={t('usernameLabel')}>
          <Input placeholder={t('usernamePlaceholder')} {...r('name')} />
        </Group>

        <Group label={t('bioLabel')}>
          <Textarea placeholder={t('bioPlaceholder')} {...r('bio')} />
        </Group>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={closeServerScreens}>
            {t('cancel')}
          </Button>
          <Button onClick={onUpdateUser}>{t('saveChanges')}</Button>
        </div>
      </CardContent>
    </Card>
  );
});

export { Profile };
