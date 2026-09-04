import { getErrorMessage } from '@sharkord/shared';
import chalk from 'chalk';
import http from 'http';
import z from 'zod';
import { config } from '../config';
import { getWsInfo } from '../helpers/get-ws-info';
import { logger } from '../logger';
import { pluginManager } from '../plugins';
import { SERVER_VERSION } from '../utils/env';
import { HttpValidationError, PayloadTooLargeError } from './errors';
import { healthRouteHandler } from './healthz';
import {
  applyCorsHeaders,
  getRequestUrl,
  hasPrefixPathSegment,
  isSupportedHttpMethod,
  sendJsonError,
  sendJsonFieldErrors,
  type HttpRouteHandler,
  type TSupportedHttpMethod
} from './helpers';
import { infoRouteHandler } from './info';
import { interfaceRouteHandler } from './interface';
import { loginRouteHandler } from './login';
import { manifestRouteHandler } from './manifest';
import { oidcBackchannelLogoutRouteHandler } from './oidc/backchannel-logout';
import { oidcCallbackRouteHandler } from './oidc/callback';
import { oidcExchangeRouteHandler } from './oidc/exchange';
import { oidcLoginRouteHandler } from './oidc/login';
import { pluginBundleRouteHandler } from './plugin-bundle';
import { runPluginRoute } from './plugin-route';
import { pluginsComponentsRouteHandler } from './plugins-components';
import { publicRouteHandler } from './public';
import { uploadFileRouteHandler } from './upload';

// parsed once per request and handed to every handler, so nothing below re-parses the url
// or re-resolves the client ip
type RouteContext = {
  info: ReturnType<typeof getWsInfo>;
  pathname: string;
  url: URL;
};

// plugin routes are registered with decoded paths, so decode per segment to keep
// an encoded '/' inside a segment from splitting into two
const getPluginRoute = (pathname: string) => {
  if (!hasPrefixPathSegment(pathname, '/plugins')) {
    return undefined;
  }

  const [, , pluginId, ...routePathSegments] = pathname.split('/');

  if (!pluginId) {
    return undefined;
  }

  try {
    return {
      pluginId: decodeURIComponent(pluginId),
      routePath: `/${routePathSegments
        .map((segment) => decodeURIComponent(segment))
        .join('/')}`
    };
  } catch {
    return undefined;
  }
};

const routeHandlers: Partial<
  Record<
    TSupportedHttpMethod,
    {
      exact: Record<string, HttpRouteHandler<RouteContext>>;
      prefix: Record<string, HttpRouteHandler<RouteContext>>;
    }
  >
> = {
  GET: {
    exact: {
      '/healthz': healthRouteHandler,
      '/info': infoRouteHandler,
      '/manifest.json': manifestRouteHandler,
      '/oidc/login': oidcLoginRouteHandler,
      '/oidc/callback': oidcCallbackRouteHandler
    },
    prefix: {
      '/public': publicRouteHandler,
      '/plugin-components': pluginsComponentsRouteHandler,
      '/plugin-bundle': pluginBundleRouteHandler
    }
  },
  POST: {
    exact: {
      '/upload': uploadFileRouteHandler,
      '/login': loginRouteHandler,
      '/oidc/exchange': oidcExchangeRouteHandler,
      '/oidc/backchannel-logout': oidcBackchannelLogoutRouteHandler
    },
    prefix: {}
  }
};

// this http server implementation is temporary and will be moved to bun server later when things are more stable
const createHttpServer = async (port: number = config.server.port) => {
  return new Promise<http.Server>((resolve) => {
    const server = http.createServer(
      async (req: http.IncomingMessage, res: http.ServerResponse) => {
        applyCorsHeaders(req, res);

        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('X-Sharkord-Version', SERVER_VERSION);

        const info = getWsInfo(undefined, req);
        const url = getRequestUrl(req);

        logger.debug(
          `${chalk.dim('[HTTP]')} ${req.method} ${url?.pathname} - ${info?.ip}`
        );

        if (!url) {
          sendJsonError(res, 400, 'Bad request');
          return;
        }

        const pathname = url.pathname;
        const ctx: RouteContext = { info, pathname, url };

        try {
          const method =
            req.method && isSupportedHttpMethod(req.method)
              ? req.method
              : undefined;

          if (method) {
            const methodHandlers = routeHandlers[method];

            if (methodHandlers) {
              const exactHandler = methodHandlers.exact[pathname];

              if (exactHandler) {
                return await exactHandler(req, res, ctx);
              }

              for (const [prefix, prefixHandler] of Object.entries(
                methodHandlers.prefix
              )) {
                if (hasPrefixPathSegment(pathname, prefix)) {
                  return await prefixHandler(req, res, ctx);
                }
              }
            }

            const pluginRoute = getPluginRoute(pathname);

            if (pluginRoute) {
              const route = pluginManager.getHttpRoute(
                pluginRoute.pluginId,
                method,
                pluginRoute.routePath
              );

              if (route) {
                return await runPluginRoute(req, res, route);
              }

              if (method !== 'OPTIONS') {
                sendJsonError(res, 404, 'Not found');

                return;
              }
            }
          }

          if (method === 'OPTIONS') {
            res.writeHead(204);
            res.end();

            return;
          }

          // fallback to interface route handler for GET requests
          if (method === 'GET') {
            return await interfaceRouteHandler(req, res, ctx);
          }
        } catch (error) {
          // a handler that already started writing cannot be turned into an error
          // response, so drop the connection instead of throwing on writeHead
          if (res.headersSent) {
            logger.error(
              'HTTP route error after the response started: %s',
              getErrorMessage(error)
            );

            res.destroy();
            return;
          }

          const errorsMap: Record<string, string> = {};

          if (error instanceof PayloadTooLargeError) {
            sendJsonError(res, 413, error.message);
            return;
          }

          if (error instanceof z.ZodError) {
            for (const issue of error.issues) {
              const field = issue.path[0];

              if (typeof field === 'string') {
                errorsMap[field] = issue.message;
              }
            }

            sendJsonFieldErrors(res, 400, errorsMap);
            return;
          } else if (error instanceof HttpValidationError) {
            errorsMap[error.field] = error.message;

            sendJsonFieldErrors(res, 400, errorsMap);
            return;
          }

          logger.error('HTTP route error: %s', getErrorMessage(error));

          sendJsonError(res, 500, 'Internal server error');
          return;
        }

        sendJsonError(res, 404, 'Not found');
      }
    );

    server.on('listening', () => {
      logger.debug('HTTP server is listening on port %d', port);
      resolve(server);
    });

    server.on('close', () => {
      logger.debug('HTTP server closed');
    });

    server.listen(port);
  });
};

export { createHttpServer };
