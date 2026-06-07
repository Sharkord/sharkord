import { randomUUIDv7 } from 'bun';
import { config } from '../../config';
import { getSettings } from '../../db/queries/server';
import { shouldAskServerPassword } from '../../helpers/should-ask-server-password';
import { publicProcedure, rateLimitedProcedure } from '../../utils/trpc';

const handshakeRoute = rateLimitedProcedure(publicProcedure, {
  maxRequests: config.rateLimiters.handshake.maxRequests,
  windowMs: config.rateLimiters.handshake.windowMs,
  logLabel: 'handshake'
}).query(async ({ ctx }) => {
  const settings = await getSettings();
  const handshakeHash = randomUUIDv7();
  const shouldAskForPassword = await shouldAskServerPassword(ctx.user.id, {
    password: settings.password,
    onlyAskForPasswordOnFirstJoin: settings.onlyAskForPasswordOnFirstJoin
  });

  ctx.handshakeHash = handshakeHash;

  return { handshakeHash, hasPassword: shouldAskForPassword };
});

export { handshakeRoute };
