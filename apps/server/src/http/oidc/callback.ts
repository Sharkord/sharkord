import { getErrorMessage, OidcError } from '@sharkord/shared';
import type http from 'http';
import jwt from 'jsonwebtoken';
import * as client from 'openid-client';
import { getServerToken } from '../../db/queries/server';
import type { getWsInfo } from '../../helpers/get-ws-info';
import { oidcManager } from '../../helpers/oidc/manager';
import { resolveOidcUser, type TOidcClaims } from '../../helpers/oidc/user';
import { safeCompare } from '../../helpers/safe-compare';
import { logger } from '../../logger';
import { getPublicOrigin } from '../helpers';
import {
  clearStateCookie,
  getCookie,
  guardOidcRoute,
  OIDC_STATE_COOKIE,
  redirectWithError
} from './common';

class OidcCallbackError extends Error {
  constructor(
    readonly code: OidcError,
    message: string
  ) {
    super(message);
  }
}

const collectClaims = async (
  oidcConfig: client.Configuration,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
): Promise<TOidcClaims> => {
  const idTokenClaims = tokens.claims();

  if (!idTokenClaims?.sub) {
    throw new OidcCallbackError(
      OidcError.SERVER_ERROR,
      'ID token is missing the sub claim'
    );
  }

  const needsUserInfo =
    !idTokenClaims.email ||
    !idTokenClaims.preferred_username ||
    !idTokenClaims.picture;

  if (!needsUserInfo) return { ...idTokenClaims };

  try {
    const userInfo = await client.fetchUserInfo(
      oidcConfig,
      tokens.access_token,
      idTokenClaims.sub
    );

    return { ...userInfo, ...idTokenClaims };
  } catch (error) {
    logger.warn(
      'OIDC userinfo request failed, continuing with ID token claims only: %s',
      getErrorMessage(error)
    );

    return { ...idTokenClaims };
  }
};

const completeOidcCallback = async (
  req: http.IncomingMessage,
  url: URL
): Promise<string> => {
  const stateParam = url.searchParams.get('state');
  const stateCookie = getCookie(req, OIDC_STATE_COOKIE);

  if (url.searchParams.has('error')) {
    throw new OidcCallbackError(
      OidcError.ACCESS_DENIED,
      `Provider returned "${url.searchParams.get('error')}"`
    );
  }

  if (!stateParam || !stateCookie || !safeCompare(stateParam, stateCookie)) {
    throw new OidcCallbackError(
      OidcError.INVALID_STATE,
      'State parameter does not match the state cookie'
    );
  }

  const transaction = oidcManager.takeTransaction(stateParam);

  if (!transaction) {
    throw new OidcCallbackError(
      OidcError.EXPIRED,
      'No pending login for this state, it expired or was already used'
    );
  }

  const oidcConfig = await oidcManager.getConfiguration();

  const tokens = await client.authorizationCodeGrant(oidcConfig, url, {
    pkceCodeVerifier: transaction.codeVerifier,
    expectedState: stateParam,
    expectedNonce: transaction.nonce
  });

  const claims = await collectClaims(oidcConfig, tokens);
  const { user } = await resolveOidcUser(claims);

  if (user.banned) {
    throw new OidcCallbackError(
      OidcError.ACCESS_DENIED,
      `Banned user "${user.identity}" attempted to sign in through OIDC`
    );
  }

  // tokenVersion has to travel with the token, otherwise a kick or a password change no
  // longer invalidates the session and anyone already bumped can never sign in again
  const token = jwt.sign(
    { userId: user.id, tokenVersion: user.tokenVersion },
    await getServerToken(),
    { expiresIn: '604800s' } // 7 days, matching the password login
  );

  return oidcManager.createHandoff(token);
};

const oidcCallbackRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  { info, url }: { info: ReturnType<typeof getWsInfo>; url: URL }
) => {
  if (!guardOidcRoute(req, res, info?.ip, '/oidc/callback')) return;

  const origin = getPublicOrigin(req);
  const clearCookie = clearStateCookie(req);

  try {
    const handoffCode = await completeOidcCallback(req, url);
    const target = new URL(origin);

    target.searchParams.set('oidc', handoffCode);

    res.writeHead(302, {
      'Cache-Control': 'no-store',
      'Set-Cookie': clearCookie,
      Location: target.toString()
    });
    res.end();
  } catch (error) {
    const code =
      error instanceof OidcCallbackError ? error.code : OidcError.SERVER_ERROR;

    if (error instanceof client.ResponseBodyError) {
      logger.error(
        'OIDC callback failed: provider returned "%s" (%s) with status %d',
        error.error,
        error.error_description ?? 'no description',
        error.status
      );
    } else {
      logger.error('OIDC callback failed: %s', getErrorMessage(error));
    }

    redirectWithError(res, origin, code, { 'Set-Cookie': clearCookie });
  }
};

export { oidcCallbackRouteHandler };
