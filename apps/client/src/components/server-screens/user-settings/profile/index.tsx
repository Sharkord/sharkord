import { closeServerScreens } from '@/features/server-screens/actions';
import { useOwnPublicUser } from '@/features/server/users/hooks';
import { getFileUrl } from '@/helpers/get-file-url';
import { useForm } from '@/hooks/use-form';
import { getTRPCClient } from '@/lib/trpc';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ColorPicker,
  Group,
  ImageSwatchExtractNSelect,
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
  const { setTrpcErrors, r, rr, values } = useForm({
    name: ownPublicUser?.name ?? '',
    profileTheme: {
      banner: {
        type: 'solid',
        colors: [ownPublicUser?.profileTheme?.banner?.colors?.[0] ?? '#262626']
      }
    },
    bio: ownPublicUser?.bio ?? ''
  });

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
        <div className="flex space-x-8">
          <AvatarManager user={ownPublicUser} />

          <div className="inline-flex space-x-8">
            <BannerManager user={ownPublicUser} />
            {/* t('profileColorLabel') */}
            <Group label={'Profile color'}>
              <ColorPicker
                value={values.profileTheme.banner.colors[0]}
                onChange={(color) =>
                  rr('profileTheme').onChange({
                    ...values.profileTheme,
                    banner: { ...values.profileTheme.banner, colors: [color] }
                  })
                }
                defaultValue="#262626"
              />
              <p className="text-sm -mb-3 mt-2">
                Image swatches (click to use as profile color)
              </p>
              <ImageSwatchExtractNSelect
                src={userAvatarUrl}
                onChange={(color) =>
                  rr('profileTheme').onChange({
                    ...values.profileTheme,
                    banner: { ...values.profileTheme.banner, colors: [color] }
                  })
                }
              />
              <ImageSwatchExtractNSelect
                className="-mt-3"
                src={userBannerUrl}
                onChange={(color) =>
                  rr('profileTheme').onChange({
                    ...values.profileTheme,
                    banner: { ...values.profileTheme.banner, colors: [color] }
                  })
                }
              />
            </Group>
          </div>
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
