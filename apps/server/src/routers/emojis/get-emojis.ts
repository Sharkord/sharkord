import { Permission } from '@sharkord/shared';
import { getEmojis } from '../../db/queries/emojis';
import { protectedProcedure } from '../../utils/trpc';

const getEmojisRoute = protectedProcedure.query(async ({ ctx }) => {
  await ctx.needsPermission(Permission.MANAGE_EMOJIS);

  const emojis = await getEmojis();

  return emojis;
});

export { getEmojisRoute };
