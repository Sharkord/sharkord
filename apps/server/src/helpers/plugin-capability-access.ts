import {
  OWNER_ROLE_ID,
  PluginCapabilityMode,
  PluginCapabilityType,
  type TPluginCapabilityAccess,
  type TPluginCapabilityAccessRule
} from '@sharkord/shared';
import {
  getCapabilityAccess,
  getCapabilityRows
} from '../db/queries/plugin-capabilities';
import { getRoles, getUserRoleIds, userCan } from '../db/queries/roles';
import { pluginManager } from '../plugins';

const canUseResolvedCapability = async (
  userId: number,
  pluginId: string,
  type: PluginCapabilityType,
  name: string,
  access: TPluginCapabilityAccess | null
): Promise<boolean> => {
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

const canUseCapability = async (
  userId: number,
  pluginId: string,
  type: PluginCapabilityType,
  name: string
): Promise<boolean> =>
  canUseResolvedCapability(
    userId,
    pluginId,
    type,
    name,
    await getCapabilityAccess(pluginId, type, name)
  );

const getCapabilityAccessRules = async (): Promise<
  TPluginCapabilityAccessRule[]
> => {
  const [stored, roles] = await Promise.all([getCapabilityRows(), getRoles()]);

  const rules = stored
    .filter((row) => row.mode === PluginCapabilityMode.RESTRICTED)
    .map(({ pluginId, type, name, roleIds }) => ({
      pluginId,
      type,
      name,
      roleIds
    }));

  for (const requirement of pluginManager.getCapabilityRequirements()) {
    const { pluginId, type, name, requires } = requirement;

    const isConfigured = stored.some(
      (row) =>
        row.pluginId === pluginId && row.type === type && row.name === name
    );

    if (isConfigured) continue;

    rules.push({
      pluginId,
      type,
      name,
      roleIds: roles
        .filter(
          (role) =>
            role.id !== OWNER_ROLE_ID && role.permissions.includes(requires)
        )
        .map((role) => role.id)
    });
  }

  return rules;
};

export { canUseCapability, canUseResolvedCapability, getCapabilityAccessRules };
