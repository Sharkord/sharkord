import { DisconnectCode, getErrorMessage } from '@sharkord/shared';
import type http from 'http';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { config } from '../../config';
import { invalidateUserSessions } from '../../db/mutations/users';
import { getUserByOidcSub } from '../../db/queries/users';
import type { getWsInfo } from '../../helpers/get-ws-info';
import { oidcManager } from '../../helpers/oidc/manager';
import { logger } from '../../logger';
import { disconnectUser } from '../../utils/wss';
import { getTextBody, sendJsonError } from '../helpers';
import { guardOidcRoute } from './common';

const LOGOUT_EVENT = 'http://schemas.openid.net/event/backchannel-logout';

let jwks: { uri: string; keys: ReturnType<typeof createRemoteJWKSet> } | null =
  null;

const getJwks = (uri: string) => {
  if (jwks?.uri !== uri) {
    jwks = { uri, keys: createRemoteJWKSet(new URL(uri)) };
  }

  return jwks.keys;
};

const isLogoutEvent = (payload: JWTPayload): boolean => {
  const events = payload.events;

  if (!events || typeof events !== 'object') return false;

  return typeof (events as Record<string, unknown>)[LOGOUT_EVENT] === 'object';
};

const readLogoutToken = async (
  body: string
): Promise<{ sub: string; issuer: string }> => {
  const logoutToken = new URLSearchParams(body).get('logout_token');

  if (!logoutToken) throw new Error('no logout_token in the request body');

  const oidcConfig = await oidcManager.getConfiguration();
  const metadata = oidcConfig.serverMetadata();

  if (!metadata.jwks_uri) {
    throw new Error('the provider advertises no jwks_uri');
  }

  const { payload } = await jwtVerify(logoutToken, getJwks(metadata.jwks_uri), {
    issuer: metadata.issuer,
    audience: config.oidc.clientId,
    requiredClaims: ['iat', 'jti', 'events']
  });

  if (payload.nonce !== undefined) {
    throw new Error('logout token carries a nonce');
  }

  if (!isLogoutEvent(payload)) {
    throw new Error('logout token is not a back-channel logout event');
  }

  if (typeof payload.sub !== 'string') {
    throw new Error('logout token identifies no subject');
  }

  return { sub: payload.sub, issuer: metadata.issuer };
};

const oidcBackchannelLogoutRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  { info }: { info: ReturnType<typeof getWsInfo> }
) => {
  const guarded = guardOidcRoute(req, res, {
    ip: info?.ip,
    route: '/oidc/backchannel-logout',
    isNavigation: false
  });

  if (!guarded) return;

  let token: { sub: string; issuer: string };

  try {
    token = await readLogoutToken(await getTextBody(req));
  } catch (error) {
    logger.warn(
      'OIDC back-channel logout rejected: %s',
      getErrorMessage(error)
    );

    sendJsonError(res, 400, 'invalid_request');

    return;
  }

  const user = await getUserByOidcSub(token.sub);

  if (user && user.oidcIssuer === token.issuer) {
    await invalidateUserSessions(user.id);

    disconnectUser(
      user.id,
      DisconnectCode.KICKED,
      'Signed out by the provider'
    );

    logger.info(
      'OIDC back-channel logout ended the sessions of user %d',
      user.id
    );
  }

  res.writeHead(200, { 'Cache-Control': 'no-store' });
  res.end();
};

export { oidcBackchannelLogoutRouteHandler };
