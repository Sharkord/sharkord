import {
  OWNER_ROLE_ID,
  PluginCapabilityMode,
  PluginCapabilityType,
  type TPluginComponentAccessRule
} from '@sharkord/shared';
import {
  getCapabilityAccess,
  getComponentCapabilityRows
} from '../db/queries/plugin-capabilities';
import { getRoles, getUserRoleIds, userCan } from '../db/queries/roles';
import { pluginManager } from '../plugins';

const canUseCapability = async (
  userId: number,
  pluginId: string,
  type: PluginCapabilityType,
  name: string
): Promise<boolean> => {
  const access = await getCapabilityAccess(pluginId, type, name);

  if (!access) {
    const requires = pluginManager.getRequiredPermission(pluginId, type, name);

    return requires ? userCan(userId, requires) : true;
  }

  if (access.mode === PluginCapabilityMode.PUBLIC) return true;

  const roleIds = await getUserRoleIds(userId);

  if (roleIds.includes(OWNER_ROLE_ID)) return true;
  if (access.roleIds.length === 0 || roleIds.length === 0) return false;

  return roleIds.some((roleId) => access.roleIds.includes(roleId));
};

const getComponentAccessRules = async (): Promise<
  TPluginComponentAccessRule[]
> => {
  const [stored, roles] = await Promise.all([
    getComponentCapabilityRows(),
    getRoles()
  ]);

  const rules = stored
    .filter((row) => row.mode === PluginCapabilityMode.RESTRICTED)
    .map(({ pluginId, name, roleIds }) => ({ pluginId, name, roleIds }));

  for (const [pluginId, requirements] of pluginManager
    .getComponentRequirements()
    .entries()) {
    for (const [name, permission] of Object.entries(requirements)) {
      const isConfigured = stored.some(
        (row) => row.pluginId === pluginId && row.name === name
      );

      if (isConfigured) continue;

      rules.push({
        pluginId,
        name,
        roleIds: roles
          .filter(
            (role) =>
              role.id !== OWNER_ROLE_ID && role.permissions.includes(permission)
          )
          .map((role) => role.id)
      });
    }
  }

  return rules;
};

export { canUseCapability, getComponentAccessRules };
