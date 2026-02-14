import { Permission } from '@sharkord/shared';
import { getGiphyApiKey } from '../../utils/giphy-config';
import { protectedProcedure } from '../../utils/trpc';

const getGiphyConfigRoute = protectedProcedure.query(async ({ ctx }) => {
  await ctx.needsPermission(Permission.MANAGE_SETTINGS);

  return { apiKey: getGiphyApiKey() };
});

export { getGiphyConfigRoute };
