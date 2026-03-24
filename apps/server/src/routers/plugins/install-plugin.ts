import { Permission } from '@sharkord/shared';
import z from 'zod';
import { downloadPlugin } from '../../helpers/downloads';
import { protectedProcedure } from '../../utils/trpc';

const installRoute = protectedProcedure
  .input(
    z.object({
      url: z.url(),
      checksum: z.string().min(1)
    })
  )
  .mutation(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_PLUGINS);

    await downloadPlugin(input.url, input.checksum);
  });

export { installRoute };
