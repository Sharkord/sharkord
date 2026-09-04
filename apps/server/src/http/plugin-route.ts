import { PluginCapabilityMode, PluginCapabilityType } from '@sharkord/shared';
import type http from 'http';
import { config } from '../config';
import { getCapabilityAccess } from '../db/queries/plugin-capabilities';
import { getUserByToken } from '../db/queries/users';
import { getWsInfo } from '../helpers/get-ws-info';
import { canUseResolvedCapability } from '../helpers/plugin-capability-access';
import {
  getRouteKey,
  type TPluginHttpRoute
} from '../plugins/http-route-registry';
import { createRateLimiter } from '../utils/rate-limiters/rate-limiter';
import {
  enforceHttpRateLimit,
  getRequestToken,
  sendJsonError
} from './helpers';

const pluginRouteRateLimiter = createRateLimiter({
  maxRequests: config.rateLimiters.pluginRoute.maxRequests,
  windowMs: config.rateLimiters.pluginRoute.windowMs
});

const runPluginRoute = async (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  route: TPluginHttpRoute
) => {
  const allowed = enforceHttpRateLimit(
    res,
    pluginRouteRateLimiter,
    getWsInfo(undefined, req)?.ip,
    {
      route: `/plugins${route.path}`,
      message: 'Too many requests. Please try again shortly.'
    }
  );

  if (!allowed) {
    req.resume();

    return;
  }

  const { options } = route;
  const capabilityName = getRouteKey(route.method, route.path);

  const access = await getCapabilityAccess(
    route.pluginId,
    PluginCapabilityType.HTTP_ROUTE,
    capabilityName
  );

  // an admin restricting a route makes it authenticated whatever the plugin
  // asked for, since there is no caller to match against roles otherwise. auth
  // works the other way and stays the plugin's call: its handler expects a
  // userId, so opening the route up cannot take that away
  const needsCaller =
    options?.auth ||
    options?.requires ||
    access?.mode === PluginCapabilityMode.RESTRICTED;

  if (!needsCaller) {
    return route.handler(req, res, {});
  }

  const user = await getUserByToken(getRequestToken(req));

  if (!user) {
    sendJsonError(res, 401, 'Authentication required.');

    return;
  }

  const canUseRoute = await canUseResolvedCapability(
    user.id,
    route.pluginId,
    PluginCapabilityType.HTTP_ROUTE,
    capabilityName,
    access
  );

  if (!canUseRoute) {
    sendJsonError(res, 403, 'Insufficient permissions.');

    return;
  }

  return route.handler(req, res, { userId: user.id });
};

export { runPluginRoute };
