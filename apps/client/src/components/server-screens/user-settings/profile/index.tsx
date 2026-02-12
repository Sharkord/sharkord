import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import Color from '@/components/ui/color';
import { Group } from '@/components/ui/group';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { closeServerScreens } from '@/features/server-screens/actions';
import { useOwnPublicUser } from '@/features/server/users/hooks';
import { useForm } from '@/hooks/use-form';
import { getTRPCClient } from '@/lib/trpc';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { AvatarManager } from './avatar-manager';
import { BannerManager } from './banner-manager';

const Profile = memo(() => {
  const { t } = useTranslation();
  const ownPublicUser = useOwnPublicUser();
  const { setTrpcErrors, r, rr, values } = useForm({
    name: ownPublicUser?.name ?? '',
    bannerColor: ownPublicUser?.bannerColor ?? '#FFFFFF',
    bio: ownPublicUser?.bio ?? ''
  });

  const onUpdateUser = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      await trpc.users.update.mutate(values);
      toast.success(t('userSettings.profile.toasts.updated'));
    } catch (error) {
      setTrpcErrors(error);
    }
  }, [values, setTrpcErrors, t]);

  if (!ownPublicUser) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('userSettings.profile.title')}</CardTitle>
        <CardDescription>
          {t('userSettings.profile.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AvatarManager user={ownPublicUser} />

        <Group label={t('userSettings.profile.usernameLabel')}>
          <Input
            placeholder={t('userSettings.profile.usernamePlaceholder')}
            {...r('name')}
          />
        </Group>

        <Group label={t('userSettings.profile.bioLabel')}>
          <Textarea
            placeholder={t('userSettings.profile.bioPlaceholder')}
            {...r('bio')}
          />
        </Group>

        <Group label={t('userSettings.profile.bannerColorLabel')}>
          <Color {...rr('bannerColor')} defaultValue="#FFFFFF" />
        </Group>

        <BannerManager user={ownPublicUser} />

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={closeServerScreens}>
            {t('userSettings.actions.cancel')}
          </Button>
          <Button onClick={onUpdateUser}>
            {t('userSettings.actions.saveChanges')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export { Profile };
