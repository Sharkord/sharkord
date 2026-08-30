import { useInfo } from '@/features/server/hooks';
import { getUrlFromServer } from '@/helpers/get-file-url';
import { getOidcHandoffCode, startOidcLogin } from '@/helpers/oidc';
import { useStrictEffect } from '@/hooks/use-strict-effect';
import { OidcError } from '@sharkord/shared';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TUseOidcLoginOptions = {
  onToken: (token: string) => Promise<void>;
};

const getOidcError = () =>
  new URLSearchParams(window.location.search).get('oidc_error');

const useOidcLogin = ({ onToken }: TUseOidcLoginOptions) => {
  const { t } = useTranslation('connect');
  const info = useInfo();

  const [isCompleting, setIsCompleting] = useState(
    () => !!getOidcHandoffCode()
  );

  const exchangeCode = useCallback(
    async (code: string) => {
      try {
        const response = await fetch(`${getUrlFromServer()}/oidc/exchange`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code })
        });

        if (!response.ok) throw new Error(t('oidcError.expired'));

        const data = (await response.json()) as { token: string };

        await onToken(data.token);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        toast.error(t('connectError', { message }));
      } finally {
        setIsCompleting(false);
      }
    },
    [onToken, t]
  );

  useStrictEffect(() => {
    const code = getOidcHandoffCode();
    const error = getOidcError();

    if (!code && !error) return;

    window.history.replaceState({}, document.title, window.location.pathname);

    if (error) {
      const isKnown = Object.values(OidcError).includes(error as OidcError);

      toast.error(t(isKnown ? `oidcError.${error}` : 'oidcError.server_error'));
      setIsCompleting(false);

      return;
    }

    exchangeCode(code!);
  }, [exchangeCode, t]);

  return {
    isCompleting,
    isEnabled: !!info?.oidcEnabled,
    isLocalLoginAllowed: !info?.oidcDisableLocalLogin,
    startLogin: startOidcLogin
  };
};

export { useOidcLogin };
