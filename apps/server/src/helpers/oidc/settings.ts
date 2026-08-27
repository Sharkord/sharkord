import { config } from '../../config';

const isOidcEnabled = () => config.oidc.enabled;

const isLocalLoginDisabled = () =>
  config.oidc.enabled && config.oidc.disableLocalLogin;

const getOidcServerInfo = () => ({
  oidcEnabled: isOidcEnabled(),
  oidcDisableLocalLogin: isLocalLoginDisabled()
});

export { getOidcServerInfo, isLocalLoginDisabled, isOidcEnabled };
