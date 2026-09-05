import { getErrorMessage, OidcError } from '@sharkord/shared';
import type http from 'http';
import * as client from 'openid-client';
import type { getWsInfo } from '../../helpers/get-ws-info';
import {
  oidcManager,
  TRANSACTION_TTL_SECONDS
} from '../../helpers/oidc/manager';
import { logger } from '../../logger';
import { buildStateCookie, guardOidcRoute, redirectWithError } from './common';

const oidcLoginRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  { info }: { info: ReturnType<typeof getWsInfo> }
) => {
  const guarded = guardOidcRoute(req, res, {
    ip: info?.ip,
    route: '/oidc/login',
    isNavigation: true
  });

  if (!guarded) return;

  try {
    const oidcConfig = await oidcManager.getConfiguration();

    const state = client.randomState();
    const nonce = client.randomNonce();
    const codeVerifier = client.randomPKCECodeVerifier();
    const codeChallenge = await client.calculatePKCECodeChallenge(codeVerifier);
    const redirectUri = oidcManager.resolveRedirectUri(req);

    oidcManager.startTransaction(state, { nonce, codeVerifier, redirectUri });

    const authorizationUrl = client.buildAuthorizationUrl(oidcConfig, {
      redirect_uri: redirectUri,
      scope: 'openid profile email',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state,
      nonce
    });

    res.writeHead(302, {
      'Cache-Control': 'no-store',
      'Set-Cookie': buildStateCookie(req, state, TRANSACTION_TTL_SECONDS),
      Location: authorizationUrl.href
    });
    res.end();
  } catch (error) {
    logger.error('OIDC login failed to start: %s', getErrorMessage(error));

    redirectWithError(req, res, OidcError.SERVER_ERROR);
  }
};

export { oidcLoginRouteHandler };
