import { CLIENT_ENTRY_FILE } from '@sharkord/shared';
import http from 'http';
import path from 'path';
import { getSettings } from '../db/queries/server';
import { isPathInside, PLUGINS_PATH } from '../helpers/paths';
import { pluginManager } from '../plugins';
import { sendFile, sendJsonError } from './helpers';

const pluginBundleRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  { url }: { url: URL }
) => {
  const { enablePlugins } = await getSettings();

  if (!enablePlugins) {
    sendJsonError(res, 403, 'Plugins are disabled on this server');

    return;
  }

  let decodedPathname: string;

  try {
    decodedPathname = decodeURIComponent(url.pathname);
  } catch {
    sendJsonError(res, 400, 'Invalid URL encoding');

    return;
  }

  const [, route, pluginId, ...filePathParts] = decodedPathname.split('/');

  if (route !== 'plugin-bundle') {
    sendJsonError(res, 404, 'Not found');

    return;
  }

  if (!pluginId || filePathParts.length === 0) {
    sendJsonError(res, 400, 'Plugin ID and file path are required in the URL');

    return;
  }

  const requestedSubPath = filePathParts.join('/');

  // this route is fetched unauthenticated by every browser, so it exposes the
  // one file the client actually imports and nothing else in the plugin folder
  if (requestedSubPath !== CLIENT_ENTRY_FILE) {
    sendJsonError(res, 404, 'Not found');

    return;
  }

  if (!pluginManager.isEnabled(pluginId)) {
    sendJsonError(res, 404, 'Not found');

    return;
  }

  const pluginPath = path.resolve(PLUGINS_PATH, pluginId);

  if (!isPathInside(PLUGINS_PATH, pluginPath)) {
    sendJsonError(res, 403, 'Forbidden');

    return;
  }

  // the sub path is a fixed constant by now, so it cannot escape pluginPath
  const requestedPath = path.resolve(pluginPath, requestedSubPath);

  const fileName = path.basename(requestedPath);

  await sendFile(req, res, requestedPath, {
    cacheControl: 'no-cache',
    contentDisposition: `attachment; filename="${fileName}"`,
    notFoundMessage: 'File not found on disk'
  });

  return res;
};

export { pluginBundleRouteHandler };
