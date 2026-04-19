import { randomUUIDv7 } from 'bun';
import { getSettings } from '../../db/queries/server';
import { shouldAskServerPassword } from '../../helpers/should-ask-server-password';
import { publicProcedure } from '../../utils/trpc';

const handshakeRoute = publicProcedure.query(async ({ ctx }) => {
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
