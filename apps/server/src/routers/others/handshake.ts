import { randomUUIDv7 } from 'bun';
import { getSettings } from '../../db/queries/server';
import { publicProcedure } from '../../utils/trpc';

const handshakeRoute = publicProcedure.query(async ({ ctx }) => {
  const settings = await getSettings();
  const hasPassword = !!settings?.password;
  const handshakeHash = randomUUIDv7();

  ctx.handshakeHash = handshakeHash;

  return { handshakeHash, hasPassword };
});

export { handshakeRoute };
