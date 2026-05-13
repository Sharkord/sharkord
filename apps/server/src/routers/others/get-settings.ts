import { Permission } from '@sharkord/shared';
import { getSettings } from '../../db/queries/server';
import { clearFields } from '../../helpers/clear-fields';
import { protectedProcedure } from '../../utils/trpc';

const getSettingsRoute = protectedProcedure.query(async ({ ctx }) => {
  await ctx.needsPermission(Permission.MANAGE_SETTINGS);

  const settings = await getSettings();

  return clearFields(settings, ['password', 'secretToken']);
});

export { getSettingsRoute };
