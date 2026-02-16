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
import { toast } from 'sonner';
import { AvatarManager } from './avatar-manager';
import { BannerManager } from './banner-manager';
import { isEmptyMessage } from '@sharkord/shared';

const Profile = memo(() => {
  const ownPublicUser = useOwnPublicUser();
  const { setTrpcErrors, r, rr, values } = useForm({
    name: ownPublicUser?.name ?? '',
    bannerColor: ownPublicUser?.bannerColor ?? '#FFFFFF',
    bio: ownPublicUser?.bio ?? ''
  });

  const onUpdateUser = useCallback(async () => {
    const trpc = getTRPCClient();

    if(isEmptyMessage(values.name)) {
      toast.error('Invalid username');
      return;
    }
    let message = 'Profile updated'
    if(ownPublicUser.lockedUsername && ownPublicUser.name != values.name) {
      message = 'Your username cannot be changed';
      values.name = ownPublicUser.name;
    }

    try {
      await trpc.users.update.mutate(values);
      toast.success(message);
    } catch (error) {
      setTrpcErrors(error);
    }
  }, [values, setTrpcErrors]);

  if (!ownPublicUser) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your Profile</CardTitle>
        <CardDescription>
          Update your personal information and settings here.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <AvatarManager user={ownPublicUser} />

        <Group label="Username">
          <Input placeholder="Username" {...r('name')} />
        </Group>

        <Group label="Bio">
          <Textarea placeholder="Tell us about yourself..." {...r('bio')} />
        </Group>

        <Group label="Banner color">
          <Color {...rr('bannerColor')} defaultValue="#FFFFFF" />
        </Group>

        <BannerManager user={ownPublicUser} />

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={closeServerScreens}>
            Cancel
          </Button>
          <Button onClick={onUpdateUser}>Save Changes</Button>
        </div>
      </CardContent>
    </Card>
  );
});

export { Profile };
