import type { TServerInfo } from '@sharkord/shared';
import http from 'http';
import { config } from '../config';
import { getSettings } from '../db/queries/server';
import { SERVER_VERSION } from '../utils/env';

const infoRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {
  const settings = await getSettings();

  const info: TServerInfo = {
    serverId: settings.serverId,
    version: SERVER_VERSION,
    name: settings.name,
    description: settings.description,
    logo: settings.logo,
    allowNewUsers: config.server.disableLocalSignup ? false : settings.allowNewUsers,
    oidcEnabled: config.oidc.oidcEnabled
  };

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(info));
};

export { infoRouteHandler };
