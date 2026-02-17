import chalk from 'chalk';
import http from 'http';
import z from 'zod';
import { config } from '../config';
import { getWsInfo } from '../helpers/get-ws-info';
import { logger } from '../logger';
import {
  createRateLimiter,
  getClientRateLimitKey,
  getRateLimitRetrySeconds
} from '../utils/rate-limiters/rate-limiter';
import { healthRouteHandler } from './healthz';
import { infoRouteHandler } from './info';
import { interfaceRouteHandler } from './interface';
import { loginRouteHandler } from './login';
import { pluginBundleRouteHandler } from './plugin-bundle';
import { pluginsComponentsRouteHandler } from './plugins-components';
import { publicRouteHandler } from './public';
import { uploadFileRouteHandler } from './upload';
import { HttpValidationError } from './utils';

// 5 attempts per minute per IP for login route
const loginRateLimiter = createRateLimiter({
  maxRequests: config.rateLimiters.joinServer.maxRequests,
  windowMs: config.rateLimiters.joinServer.windowMs
});

// this http server implementation is temporary and will be moved to bun server later when things are more stable
const createHttpServer = async (port: number = config.server.port) => {
  return new Promise<http.Server>((resolve) => {
    const server = http.createServer(
      async (req: http.IncomingMessage, res: http.ServerResponse) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', '*');

        const info = getWsInfo(undefined, req);

        logger.debug(
          `${chalk.dim('[HTTP]')} ${req.method} ${req.url} - ${info?.ip}`
        );

        if (req.method === 'OPTIONS') {
          res.writeHead(204);
          res.end();
          return;
        }

        try {
          if (req.method === 'GET' && req.url === '/healthz') {
            return await healthRouteHandler(req, res);
          }

          if (req.method === 'GET' && req.url === '/info') {
            return await infoRouteHandler(req, res);
          }

          if (req.method === 'POST' && req.url === '/upload') {
            return await uploadFileRouteHandler(req, res);
          }

          if (req.method === 'POST' && req.url === '/login') {
            if (info?.ip) {
              // we can only rate limit if we have the client's IP

              const key = getClientRateLimitKey(info?.ip);
              const rateLimit = loginRateLimiter.consume(key);

              if (!rateLimit.allowed) {
                logger.debug(
                  `${chalk.dim('[Rate Limiter HTTP]')} /login rate limited for key "${key}"`
                );

                res.setHeader(
                  'Retry-After',
                  getRateLimitRetrySeconds(rateLimit.retryAfterMs)
                );

                res.writeHead(429, { 'Content-Type': 'application/json' });

                res.end(
                  JSON.stringify({
                    error: 'Too many login attempts. Please try again shortly.'
                  })
                );

                return;
              }
            } else {
              logger.warn(
                `${chalk.dim('[Rate Limiter HTTP]')} Missing IP address in request info, skipping rate limiting for /login route.`
              );
            }

            return await loginRouteHandler(req, res);
          }

          if (req.method === 'GET' && req.url?.startsWith('/public')) {
            return await publicRouteHandler(req, res);
          }

          if (
            req.method === 'GET' &&
            req.url?.startsWith('/plugin-components')
          ) {
            return await pluginsComponentsRouteHandler(req, res);
          }

          if (req.method === 'GET' && req.url?.startsWith('/plugin-bundle')) {
            return await pluginBundleRouteHandler(req, res);
          }

          if (req.method === 'GET' && req.url?.startsWith('/')) {
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

          logger.error('HTTP route error:', error);

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
