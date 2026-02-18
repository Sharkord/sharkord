import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Group } from '@/components/ui/group';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { connect } from '@/features/server/actions';
import { useInfo } from '@/features/server/hooks';
import { getFileUrl, getUrlFromServer } from '@/helpers/get-file-url';
import {
  getLocalStorageItem,
  LocalStorageKey,
  removeLocalStorageItem,
  SessionStorageKey,
  setLocalStorageItem,
  setSessionStorageItem
} from '@/helpers/storage';
import { useForm } from '@/hooks/use-form';
import { memo, useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner';

const Connect = memo(() => {
  const { values, r, setErrors, onChange } = useForm<{
    identity: string;
    password: string;
    rememberCredentials: boolean;
  }>({
    identity: getLocalStorageItem(LocalStorageKey.IDENTITY) || '',
    password: getLocalStorageItem(LocalStorageKey.USER_PASSWORD) || '',
    rememberCredentials: !!getLocalStorageItem(
      LocalStorageKey.REMEMBER_CREDENTIALS
    )
  });

  const [loading, setLoading] = useState(false);
  const info = useInfo();

  const inviteCode = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const invite = urlParams.get('invite');
    return invite || undefined;
  }, []);

  const onRememberCredentialsChange = useCallback(
    (checked: boolean) => {
      onChange('rememberCredentials', checked);

      if (checked) {
        setLocalStorageItem(LocalStorageKey.REMEMBER_CREDENTIALS, 'true');
      } else {
        removeLocalStorageItem(LocalStorageKey.REMEMBER_CREDENTIALS);
      }
    },
    [onChange]
  );

  const onConnectClick = useCallback(async () => {
    setLoading(true);

    try {
      const url = getUrlFromServer();
      const response = await fetch(`${url}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          identity: values.identity,
          password: values.password,
          invite: inviteCode
        })
      });

      if (!response.ok) {
        const data = await response.json();

        setErrors(data.errors || {});
        return;
      }

      const data = (await response.json()) as { token: string };

      setSessionStorageItem(SessionStorageKey.TOKEN, data.token);

      if (values.rememberCredentials) {
        setLocalStorageItem(LocalStorageKey.IDENTITY, values.identity);
        setLocalStorageItem(LocalStorageKey.USER_PASSWORD, values.password);
      }

      await connect();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      toast.error(`Could not connect: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  }, [
    values.identity,
    values.password,
    setErrors,
    values.rememberCredentials,
    inviteCode
  ]);

  const logoSrc = useMemo(() => {
    if (info?.logo) {
      return getFileUrl(info.logo);
    }

    return '/logo.webp';
  }, [info]);

  return (
    <div className="flex flex-col gap-2 justify-center items-center h-full">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex flex-col items-center gap-2 text-center">
            <img src={logoSrc} alt="Sharkord" className="w-32 h-32" />
            {info?.name && (
              <span className="text-xl font-bold leading-tight">
                {info.name}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {info?.description && (
            <span className="text-sm text-muted-foreground">
              {info?.description}
            </span>
          )}

          <div className="flex flex-col gap-2">
            <Group
              label="Identity"
              help="A unique identifier for your account on this server. You can use whatever you like, such as an email address or a username. This won't be shared publicly."
            >
              <Input {...r('identity')} />
            </Group>
            <Group label="Password">
              <Input
                {...r('password')}
                type="password"
                onEnter={onConnectClick}
              />
            </Group>
            <Group label="Remember Credentials">
              <Switch
                checked={values.rememberCredentials}
                onCheckedChange={onRememberCredentialsChange}
              />
            </Group>
          </div>

          <div className="flex flex-col gap-2">
            {!window.isSecureContext && (
              <Alert variant="destructive">
                <AlertTitle>Insecure Connection</AlertTitle>
                <AlertDescription>
                  You are accessing the server over an insecure connection
                  (HTTP). By default, browsers block access to media devices
                  such as your camera and microphone on insecure origins. This
                  means that you won't be able to use video or voice chat
                  features while connected to the server over HTTP. If you are
                  the server administrator, you can set up HTTPS by following
                  the instructions in the documentation.
                </AlertDescription>
              </Alert>
            )}

            <Button
              className="w-full"
              variant="outline"
              onClick={onConnectClick}
              disabled={loading || !values.identity || !values.password}
            >
              Connect
            </Button>

            {!info?.allowNewUsers && (
              <>
                {!inviteCode && (
                  <span className="text-xs text-muted-foreground text-center">
                    New user registrations are currently disabled. If you do not
                    have an account yet, you need to be invited by an existing
                    user to join this server.
                  </span>
                )}
              </>
            )}

            {inviteCode && (
              <Alert variant="info">
                <AlertTitle>You were invited to join this server</AlertTitle>
                <AlertDescription>
                  <span className="font-mono text-xs">
                    Invite code: {inviteCode}
                  </span>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center gap-2 text-xs text-muted-foreground select-none">
        <span>v{VITE_APP_VERSION}</span>
        <a
          href="https://github.com/sharkord/sharkord"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>

        <a
          className="text-xs"
          href="https://sharkord.com"
          target="_blank"
          rel="noopener noreferrer"
        >
          Sharkord
        </a>
      </div>
    </div>
  );
});

export { Connect };
