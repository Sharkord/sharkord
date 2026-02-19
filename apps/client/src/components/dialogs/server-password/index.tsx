import { joinServer } from '@/features/server/actions';
import { useForm } from '@/hooks/use-form';
import { cleanup } from '@/lib/trpc';
import {} from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AutoFocus,
  Group,
  Input,
  Switch
} from '@sharkord/ui';
import { memo, useCallback, useState } from 'react';
import type { TDialogBaseProps } from '../types';

type TServerPasswordDialogProps = TDialogBaseProps & {
  handshakeHash: string;
};

const ServerPasswordDialog = memo(
  ({ isOpen, close, handshakeHash }: TServerPasswordDialogProps) => {
    const { r, values, setTrpcErrors, errors } = useForm({
      password: ''
    });
    const [loading, setLoading] = useState(false);

    const onSubmit = useCallback(async () => {
      try {
        setLoading(true);
        await joinServer(handshakeHash, values.password);

        close();
      } catch (error) {
        setTrpcErrors(error);
      } finally {
        setLoading(false);
      }
    }, [handshakeHash, values.password, close, setTrpcErrors]);

    const onCancel = useCallback(() => {
      cleanup();
      close();
    }, [close]);

    return (
      <AlertDialog open={isOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enter the password</AlertDialogTitle>
            <AlertDialogDescription>
              This server is password protected. Please enter the password to
              join.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            <AutoFocus>
              <Input
                {...r('password')}
                className="mt-2"
                type="password"
                error={errors._general}
              />
            </AutoFocus>

          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
            <AutoFocus>
              <AlertDialogAction
                onClick={onSubmit}
                disabled={!values.password || loading}
              >
                Join
              </AlertDialogAction>
            </AutoFocus>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
);

export { ServerPasswordDialog };
