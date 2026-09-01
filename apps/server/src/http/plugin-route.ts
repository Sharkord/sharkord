import type http from 'http';
import { config } from '../config';
import { userCan } from '../db/queries/roles';
import { getUserByToken } from '../db/queries/users';
import { getWsInfo } from '../helpers/get-ws-info';
import type { TPluginHttpRoute } from '../plugins/http-route-registry';
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

  if (!options?.auth && !options?.requires) {
    return route.handler(req, res, {});
  }

  const user = await getUserByToken(getRequestToken(req));

  if (!user) {
    sendJsonError(res, 401, 'Authentication required.');

    return;
  }

  if (options.requires && !(await userCan(user.id, options.requires))) {
    sendJsonError(res, 403, 'Insufficient permissions.');

    return;
  }

  return route.handler(req, res, { userId: user.id });
};

export { runPluginRoute };
