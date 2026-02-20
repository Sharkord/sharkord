import { eq, sql } from 'drizzle-orm';
import http from 'http';
import { getUserByToken } from '../db/queries/users';
import { parseCookie } from '../helpers/parse-cookie';

const sessionRouteHandler = async (
  req: http.IncomingMessage,
  res: http.ServerResponse
) => {

    const cookieHeader =
        (req.headers['cookie'] as string | '') ??
        (req.headers['Cookie'] as string | '');

    if (!cookieHeader) {
        res.writeHead(403, {'Content-Type': 'application/json'})
        res.end(JSON.stringify({ success: false }));

        return res;
    }

    const sessionToken = parseCookie(cookieHeader, 'session')

    if (!sessionToken) {
        res.writeHead(403, {'Content-Type': 'application/json'})
        res.end(JSON.stringify({ success: false }));

        return res;
    }

    const existingSession = await getUserByToken(sessionToken)

    if (!existingSession?.id) {
        res.writeHead(403, {'Content-Type': 'application/json'})
        res.end(JSON.stringify({ success: false }));

        return res;
    }


    res.writeHead(200, {'Content-Type': 'application/json'})

    res.end(JSON.stringify({ success: true }));

    return res;


}

export { sessionRouteHandler }