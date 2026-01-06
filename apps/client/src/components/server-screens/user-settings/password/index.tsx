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
import { closeServerScreens } from '@/features/server-screens/actions';
import { useForm } from '@/hooks/use-form';
import { getTRPCClient } from '@/lib/trpc';
import { memo, useCallback } from 'react';
import { toast } from 'sonner';

const Password = memo(() => {
  const { setTrpcErrors, r, values } = useForm({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: ''
  });

  const updatePassword = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      await trpc.users.updatePassword.mutate(values);
      toast.success('Password updated!');
    } catch (error) {
      setTrpcErrors(error);
    }
  }, [values, setTrpcErrors]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>
          In this section, you can update your password.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Group label="Current Password">
          <Input {...r('currentPassword', 'password')} />
        </Group>

        <Group label="New Password">
          <Input {...r('newPassword', 'password')} />
        </Group>

        <Group label="Confirm New Password">
          <Input {...r('confirmNewPassword', 'password')} />
        </Group>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={closeServerScreens}>
            Cancel
          </Button>
          <Button onClick={updatePassword}>Save Changes</Button>
        </div>
      </CardContent>
    </Card>
  );
});

export { Password };
