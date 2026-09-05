import {
  OWNER_ROLE_ID,
  Permission,
  PluginCapabilityMode,
  PluginCapabilityType,
  type TPluginCapability,
  zPluginId
} from '@sharkord/shared';
import z from 'zod';
import { getPluginCapabilityAccess } from '../../db/queries/plugin-capabilities';
import { getRoles } from '../../db/queries/roles';
import { pluginManager } from '../../plugins';
import { getRouteKey } from '../../plugins/http-route-registry';
import { protectedProcedure } from '../../utils/trpc';

const getCapabilitiesRoute = protectedProcedure
  .input(z.object({ pluginId: zPluginId }))
  .query(async ({ ctx, input }) => {
    await ctx.needsPermission(Permission.MANAGE_PLUGIN_PERMISSIONS);

    const [{ modes, grants }, roles] = await Promise.all([
      getPluginCapabilityAccess(input.pluginId),
      getRoles()
    ]);

    const resolve = (
      type: PluginCapabilityType,
      name: string,
      description?: string
    ): TPluginCapability => {
      const requires = pluginManager.getRequiredPermission(
        input.pluginId,
        type,
        name
      );

      const defaultAccess = {
        mode: requires
          ? PluginCapabilityMode.RESTRICTED
          : PluginCapabilityMode.PUBLIC,
        roleIds: requires
          ? roles
              .filter(
                (role) =>
                  role.id !== OWNER_ROLE_ID &&
                  role.permissions.includes(requires)
              )
              .map((role) => role.id)
          : []
      };

      const stored = modes.find(
        (row) => row.type === type && row.name === name
      );

      if (!stored) {
        return {
          type,
          name,
          description,
          configured: false,
          requires,
          defaultAccess,
          ...defaultAccess
        };
      }

      return {
        type,
        name,
        description,
        configured: true,
        requires,
        defaultAccess,
        mode: stored.mode,
        roleIds: grants
          .filter((grant) => grant.type === type && grant.name === name)
          .map((grant) => grant.roleId)
      };
    };

    const commands = (pluginManager.getCommands()[input.pluginId] ?? []).map(
      (command) =>
        resolve(PluginCapabilityType.COMMAND, command.name, command.description)
    );

    const actions = pluginManager
      .getActionNames(input.pluginId)
      .map((name) => resolve(PluginCapabilityType.ACTION, name));

    // described by where it answers, since the name alone is just the method
    // and the path the plugin registered
    const httpRoutes = pluginManager
      .getHttpRoutes(input.pluginId)
      .map((route) =>
        resolve(
          PluginCapabilityType.HTTP_ROUTE,
          getRouteKey(route.method, route.path),
          `${route.method} /plugins/${input.pluginId}${route.path}`
        )
      );

    // a slot is known here when it was configured or declared. one that is
    // neither exists only in the client bundle, so the tab merges those in
    const declaredSlots = Object.keys(
      pluginManager.getComponentRequirements().get(input.pluginId) ?? {}
    );

    const componentNames = new Set([
      ...modes
        .filter((row) => row.type === PluginCapabilityType.COMPONENT)
        .map((row) => row.name),
      ...declaredSlots
    ]);

    const components = Array.from(componentNames).map((name) =>
      resolve(PluginCapabilityType.COMPONENT, name)
    );

    return {
      capabilities: [...commands, ...actions, ...httpRoutes, ...components]
    };
  });

export { getCapabilitiesRoute };
