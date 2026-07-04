import { getErrorMessage } from '@sharkord/shared';
import chalk from 'chalk';
import http from 'http';
import z from 'zod';
import { config } from '../config';
import { getWsInfo } from '../helpers/get-ws-info';
import { logger } from '../logger';
import { pluginManager } from '../plugins';
import {
  isPluginHttpMethod,
  supportedHttpMethods
} from '../plugins/http-route-registry';
import { healthRouteHandler } from './healthz';
import {
  getRequestPathname,
  hasPrefixPathSegment,
  type HttpRouteHandler
} from './helpers';
import { infoRouteHandler } from './info';
import { interfaceRouteHandler } from './interface';
import { loginRouteHandler } from './login';
import { manifestRouteHandler } from './manifest';
import { pluginBundleRouteHandler } from './plugin-bundle';
import { pluginsComponentsRouteHandler } from './plugins-components';
import { publicRouteHandler } from './public';
import { uploadFileRouteHandler } from './upload';
import { HttpValidationError } from './utils';

type RouteContext = {
  info: ReturnType<typeof getWsInfo>;
};

type SupportedMethod = (typeof supportedHttpMethods)[number];

const getPluginRoute = (pathname: string) => {
  if (!hasPrefixPathSegment(pathname, '/plugins')) {
    return undefined;
  }

  const [, , pluginId, ...routePathSegments] = pathname.split('/');

  if (!pluginId) {
    return undefined;
  }

  return {
    pluginId,
    routePath: routePathSegments.length
      ? `/${routePathSegments.join('/')}`
      : '/'
  };
};

const routeHandlers: Partial<
  Record<
    SupportedMethod,
    {
      exact: Record<string, HttpRouteHandler<RouteContext>>;
      prefix: Record<string, HttpRouteHandler<RouteContext>>;
    }
  >
> = {
  GET: {
    exact: {
      '/healthz': (req, res) => healthRouteHandler(req, res),
      '/info': (req, res) => infoRouteHandler(req, res),
      '/manifest.json': (req, res) => manifestRouteHandler(req, res)
    },
    prefix: {
      '/public': (req, res) => publicRouteHandler(req, res),
      '/plugin-components': (req, res) =>
        pluginsComponentsRouteHandler(req, res),
      '/plugin-bundle': (req, res) => pluginBundleRouteHandler(req, res)
    }
  },
  POST: {
    exact: {
      '/upload': (req, res) => uploadFileRouteHandler(req, res),
      '/login': (req, res) => loginRouteHandler(req, res)
    },
    prefix: {}
  }
};

// this http server implementation is temporary and will be moved to bun server later when things are more stable

const createHttpServer = async (port: number = config.server.port) => {
  return new Promise<http.Server>((resolve) => {
    const server = http.createServer(
      async (req: http.IncomingMessage, res: http.ServerResponse) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader(
          'Access-Control-Allow-Methods',
          supportedHttpMethods.join(', ')
        );
        res.setHeader('Access-Control-Allow-Headers', '*');

        const info = getWsInfo(undefined, req);

        logger.debug(
          `${chalk.dim('[HTTP]')} ${req.method} ${req.url} - ${info?.ip}`
        );

        const pathname = getRequestPathname(req);

        if (!pathname) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Bad request' }));
          return;
        }

        try {
          const method =
            req.method && isPluginHttpMethod(req.method)
              ? req.method
              : undefined;

          if (method) {
            const methodHandlers = routeHandlers[method];

            if (methodHandlers) {
              const exactHandler = methodHandlers.exact[pathname];

              if (exactHandler) {
                return await exactHandler(req, res, { info });
              }

              for (const [prefix, prefixHandler] of Object.entries(
                methodHandlers.prefix
              )) {
                if (hasPrefixPathSegment(pathname, prefix)) {
                  return await prefixHandler(req, res, { info });
                }
              }
            }

            const pluginRoute = getPluginRoute(pathname);

            if (pluginRoute) {
              const pluginRouteHandler = pluginManager.getHttpRouteHandler(
                pluginRoute.pluginId,
                method,
                pluginRoute.routePath
              );

              if (pluginRouteHandler) {
                return await pluginRouteHandler(req, res);
              }

              if (method !== 'OPTIONS') {
                res.writeHead(404, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Not found' }));

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
            return await interfaceRouteHandler(req, res);
          }
        } catch (error) {
          const errorsMap: Record<string, string> = {};

          if (error instanceof z.ZodError) {
            for (const issue of error.issues) {
              const field = issue.path[0];

              if (typeof field === 'string') {
                errorsMap[field] = issue.message;
              }
            }

            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errors: errorsMap }));
            return;
          } else if (error instanceof HttpValidationError) {
            errorsMap[error.field] = error.message;

            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ errors: errorsMap }));
            return;
          }

          logger.error('HTTP route error: %s', getErrorMessage(error));

          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Internal server error' }));
          return;
        }

        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
      }
    );

    server.on('listening', () => {
      logger.debug('HTTP server is listening on port %d', port);
      resolve(server);
    });

    server.on('close', () => {
      logger.debug('HTTP server closed');
      process.exit(0);
    });

    server.listen(port);
  });
};

export { createHttpServer };
