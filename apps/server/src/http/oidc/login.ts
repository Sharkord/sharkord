import { getErrorMessage } from '@sharkord/shared';
import type http from 'http';
import * as client from 'openid-client';
import type { getWsInfo } from '../../helpers/get-ws-info';
import {
  oidcManager,
  TRANSACTION_TTL_SECONDS
} from '../../helpers/oidc/manager';
import { logger } from '../../logger';
import { sendJsonError } from '../helpers';
import { buildStateCookie, guardOidcRoute } from './common';

const oidcLoginRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  { info }: { info: ReturnType<typeof getWsInfo> }
) => {
  if (!guardOidcRoute(req, res, info?.ip, '/oidc/login')) return;

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

    sendJsonError(res, 500, 'Internal server error');
  }
};

export { oidcLoginRouteHandler };
