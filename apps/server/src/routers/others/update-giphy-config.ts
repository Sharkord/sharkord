import { Permission } from '@sharkord/shared';
import { z } from 'zod';
import { publishSettings } from '../../db/publishers';
import { setGiphyApiKey } from '../../utils/giphy-config';
import { protectedProcedure } from '../../utils/trpc';

const updateGiphyConfigRoute = protectedProcedure
  .input(z.object({ apiKey: z.string().max(64) }))
  .mutation(async ({ input, ctx }) => {
    await ctx.needsPermission(Permission.MANAGE_SETTINGS);

    await setGiphyApiKey(input.apiKey);
    publishSettings();
  });

export { updateGiphyConfigRoute };
