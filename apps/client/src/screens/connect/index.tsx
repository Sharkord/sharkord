import { LanguageSwitcher } from '@/components/language-switcher';
import { PluginSlotRenderer } from '@/components/plugin-slot-renderer';
import { connect } from '@/features/server/actions';
import { useInfo } from '@/features/server/hooks';
import { getFileUrl, getUrlFromServer } from '@/helpers/get-file-url';
import {
  getLocalStorageItem,
  getLocalStorageItemBool,
  LocalStorageKey,
  removeLocalStorageItem,
  SessionStorageKey,
  setLocalStorageItem,
  setLocalStorageItemBool,
  setSessionStorageItem
} from '@/helpers/storage';
import { useForm } from '@/hooks/use-form';
import { PluginSlot, TestId } from '@sharkord/shared';
import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Group,
  Input,
  Label,
  Spinner,
  Switch
} from '@sharkord/ui';
import { memo, useCallback, useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useOidcLogin } from './hooks/use-oidc-login';

const Connect = memo(() => {
  const { t } = useTranslation('connect');
  const { values, r, setErrors, onChange } = useForm<{
    identity: string;
    password: string;
    autoLogin: boolean;
  }>({
    identity: getLocalStorageItem(LocalStorageKey.IDENTITY) || '',
    password: '',
    autoLogin: getLocalStorageItemBool(LocalStorageKey.AUTO_LOGIN)
  });

  const [loading, setLoading] = useState(false);
  const info = useInfo();

  const inviteCode = useMemo(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const invite = urlParams.get('invite');
    return invite || undefined;
  }, []);

  const startSession = useCallback(
    async (token: string) => {
      setSessionStorageItem(SessionStorageKey.TOKEN, token);
      setLocalStorageItemBool(LocalStorageKey.AUTO_LOGIN, values.autoLogin);

      if (values.autoLogin) {
        setLocalStorageItem(LocalStorageKey.AUTO_LOGIN_TOKEN, token);
      } else {
        removeLocalStorageItem(LocalStorageKey.AUTO_LOGIN_TOKEN);
      }

      await connect();
    },
    [values.autoLogin]
  );

  const oidc = useOidcLogin({ onToken: startSession });

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

      setLocalStorageItem(LocalStorageKey.IDENTITY, values.identity);

      await startSession(data.token);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      toast.error(t('connectError', { message: errorMessage }));
    } finally {
      setLoading(false);
    }
  }, [
    values.identity,
    values.password,
    setErrors,
    inviteCode,
    startSession,
    t
  ]);

  const onFormSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      onConnectClick();
    },
    [onConnectClick]
  );

  const onAutoLoginToggle = useCallback(() => {
    const nextAutoLogin = !values.autoLogin;

    onChange('autoLogin', nextAutoLogin);
    setLocalStorageItemBool(LocalStorageKey.AUTO_LOGIN, nextAutoLogin);

    if (!nextAutoLogin) {
      removeLocalStorageItem(LocalStorageKey.AUTO_LOGIN_TOKEN);
    }
  }, [onChange, values.autoLogin]);

  const logoSrc = useMemo(() => {
    if (info?.logo) {
      return getFileUrl(info.logo);
    }

    return '/logo.webp';
  }, [info]);

  if (oidc.isCompleting) {
    return (
      <div className="flex flex-col justify-center items-center h-full gap-2">
        <Spinner size="lg" />
        <span className="text-xl">{t('oidcCompleting')}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 justify-center items-center h-full relative">
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
        <LanguageSwitcher variant="icon" />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="flex flex-col items-center gap-2 text-center">
            <img
              src={logoSrc}
              alt="Sharkord"
              className="block max-h-32 max-w-full rounded-[5px]"
            />
            {info?.name && (
              <span className="text-xl font-bold leading-tight">
                {info.name}
              </span>
            )}
          </CardTitle>
          <PluginSlotRenderer slotId={PluginSlot.CONNECT_SCREEN} />
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {info?.description && (
            <span className="text-sm text-muted-foreground">
              {info?.description}
            </span>
          )}

          {oidc.isLocalLoginAllowed && (
            <form
              className="flex flex-col gap-2"
              onSubmit={onFormSubmit}
              data-testid={TestId.CONNECT_FORM}
            >
              <Group label={t('identityLabel')} help={t('identityHelp')}>
                <Input
                  {...r('identity')}
                  autoComplete="username"
                  data-testid={TestId.CONNECT_IDENTITY_INPUT}
                />
              </Group>
              <Group label={t('passwordLabel')}>
                <Input
                  {...r('password')}
                  type="password"
                  autoComplete="current-password"
                  onEnter={onConnectClick}
                  data-testid={TestId.CONNECT_PASSWORD_INPUT}
                />
              </Group>
            </form>
          )}

          <div
            className="flex items-center gap-2 w-fit cursor-pointer"
            data-testid={TestId.CONNECT_AUTO_LOGIN_SWITCH}
            onClick={onAutoLoginToggle}
          >
            <Switch checked={values.autoLogin} />
            <Label className="text-sm cursor-pointer">
              {t('autoLoginLabel')}
            </Label>
          </div>

          <div className="flex flex-col gap-2">
            {!window.isSecureContext && (
              <Alert variant="destructive">
                <AlertTitle>{t('insecureTitle')}</AlertTitle>
                <AlertDescription>{t('insecureDesc')}</AlertDescription>
              </Alert>
            )}

            {oidc.isLocalLoginAllowed && (
              <Button
                className="w-full"
                variant="outline"
                onClick={onConnectClick}
                disabled={loading || !values.identity || !values.password}
                data-testid={TestId.CONNECT_BUTTON}
              >
                {t('connectBtn')}
              </Button>
            )}

            {oidc.isEnabled && (
              <Button
                className="w-full"
                variant="secondary"
                onClick={oidc.startLogin}
                disabled={loading}
                data-testid={TestId.CONNECT_OIDC_BUTTON}
              >
                {t('oidcBtn')}
              </Button>
            )}

            {oidc.isLocalLoginAllowed &&
              !info?.allowNewUsers &&
              !inviteCode && (
                <span className="text-xs text-muted-foreground text-center">
                  {t('registrationDisabled')}
                </span>
              )}

            {inviteCode && (
              <Alert variant="info">
                <AlertTitle>{t('invitedTitle')}</AlertTitle>
                <AlertDescription>
                  <span className="font-mono text-xs">
                    {t('inviteCode', { code: inviteCode })}
                  </span>
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center items-center gap-2 text-xs text-muted-foreground select-none">
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
