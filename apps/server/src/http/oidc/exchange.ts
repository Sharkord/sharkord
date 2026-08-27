import type http from 'http';
import z from 'zod';
import type { getWsInfo } from '../../helpers/get-ws-info';
import { oidcManager } from '../../helpers/oidc/manager';
import { getJsonBody, sendJsonError } from '../helpers';
import { guardOidcRoute } from './common';

const zBody = z.object({
  code: z.string().min(1).max(256)
});

const oidcExchangeRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse,
  { info }: { info: ReturnType<typeof getWsInfo> }
) => {
  if (!guardOidcRoute(req, res, info?.ip, '/oidc/exchange')) return;

  const data = zBody.parse(await getJsonBody(req));
  const handoff = oidcManager.takeHandoff(data.code);

  if (!handoff) {
    sendJsonError(res, 401, 'This sign in link has expired, please try again');

    return;
  }

  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify({ success: true, token: handoff.token }));
};

export { oidcExchangeRouteHandler };
