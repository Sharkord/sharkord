import { getErrorMessage, Permission } from '@sharkord/shared';
import http from 'http';
import z from 'zod';
import { userCan } from '../db/queries/roles';
import { getUserByToken } from '../db/queries/users';
import { MAX_PLUGIN_ARCHIVE_BYTES } from '../helpers/downloads';
import { getWsInfo } from '../helpers/get-ws-info';
import { installPluginArchive } from '../helpers/install-plugin';
import { getRateLimit } from '../helpers/rate-limits';
import { logger } from '../logger';
import { createRateLimiter } from '../utils/rate-limiters/rate-limiter';
import {
  enforceHttpRateLimit,
  getRawBody,
  getRequestToken,
  sendJsonError
} from './helpers';

const pluginUploadRateLimiter = createRateLimiter({
  getLimit: () => getRateLimit()
});

const pluginUploadRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  const allowed = enforceHttpRateLimit(
    res,
    pluginUploadRateLimiter,
    getWsInfo(undefined, req)?.ip,
    {
      route: '/plugin-upload',
      message: 'Too many plugin uploads. Please try again shortly.'
    }
  );

  if (!allowed) {
    req.resume();

    return;
  }

  const token = getRequestToken(req);
  const user = token ? await getUserByToken(token) : undefined;

  if (!user) {
    req.resume();
    sendJsonError(res, 401, 'Unauthorized');

    return;
  }

  if (!(await userCan(user.id, Permission.MANAGE_PLUGINS))) {
    req.resume();
    sendJsonError(res, 403, 'You do not have permission to manage plugins');

    return;
  }

  const archiveBytes = await getRawBody(req, MAX_PLUGIN_ARCHIVE_BYTES);

  if (archiveBytes.length === 0) {
    sendJsonError(res, 400, 'No plugin archive was uploaded');

    return;
  }

  try {
    const manifest = await installPluginArchive(archiveBytes, user.id);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        id: manifest.id,
        name: manifest.name,
        version: manifest.version
      })
    );
  } catch (error) {
    const message =
      error instanceof z.ZodError
        ? `Invalid plugin manifest: ${z.prettifyError(error)}`
        : getErrorMessage(error);

    logger.warn('Rejected uploaded plugin archive: %s', message);
    sendJsonError(res, 400, message);
  }
};

export { pluginUploadRouteHandler };
