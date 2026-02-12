import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { AutoFocus } from '@/components/ui/auto-focus';
import { Group } from '@/components/ui/group';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { joinServer } from '@/features/server/actions';
import {
  getLocalStorageItem,
  LocalStorageKey,
  removeLocalStorageItem,
  setLocalStorageItem
} from '@/helpers/storage';
import { useForm } from '@/hooks/use-form';
import { cleanup } from '@/lib/trpc';
import {} from '@/types';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TDialogBaseProps } from '../types';

type TServerPasswordDialogProps = TDialogBaseProps & {
  handshakeHash: string;
};

const savedPassword = getLocalStorageItem(LocalStorageKey.SERVER_PASSWORD);

const ServerPasswordDialog = memo(
  ({ isOpen, close, handshakeHash }: TServerPasswordDialogProps) => {
    const { t } = useTranslation();
    const { r, values, setTrpcErrors, errors } = useForm({
      password: savedPassword || ''
    });
    const [savePassword, setSavePassword] = useState<boolean>(!!savedPassword);
    const [loading, setLoading] = useState(false);

    const onSubmit = useCallback(async () => {
      try {
        setLoading(true);
        await joinServer(handshakeHash, values.password);

        if (savePassword) {
          setLocalStorageItem(LocalStorageKey.SERVER_PASSWORD, values.password);
        } else {
          removeLocalStorageItem(LocalStorageKey.SERVER_PASSWORD);
        }

        close();
      } catch (error) {
        setTrpcErrors(error);
      } finally {
        setLoading(false);
      }
    }, [handshakeHash, values.password, close, setTrpcErrors, savePassword]);

    const onCancel = useCallback(() => {
      cleanup();
      close();
    }, [close]);

    return (
      <AlertDialog open={isOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dialogs.serverPassword.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dialogs.serverPassword.description')}
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

            <Group label={t('dialogs.serverPassword.savePasswordLabel')}>
              <Switch
                checked={savePassword}
                onCheckedChange={setSavePassword}
              />
            </Group>
          </div>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={onCancel}>
              {t('dialogs.serverPassword.cancel')}
            </AlertDialogCancel>
            <AutoFocus>
              <AlertDialogAction
                onClick={onSubmit}
                disabled={!values.password || loading}
              >
                {t('dialogs.serverPassword.join')}
              </AlertDialogAction>
            </AutoFocus>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
);

export { ServerPasswordDialog };
