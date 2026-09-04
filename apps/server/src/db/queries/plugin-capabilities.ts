import {
  PluginCapabilityMode,
  PluginCapabilityType,
  type TPluginCapabilityAccess
} from '@sharkord/shared';
import { and, eq } from 'drizzle-orm';
import { db } from '..';
import { pluginCapabilities, pluginCapabilityRoles } from '../schema';

const capabilityWhere = (
  pluginId: string,
  type: PluginCapabilityType,
  name: string
) =>
  and(
    eq(pluginCapabilities.pluginId, pluginId),
    eq(pluginCapabilities.type, type),
    eq(pluginCapabilities.name, name)
  );

const getCapabilityAccess = async (
  pluginId: string,
  type: PluginCapabilityType,
  name: string
): Promise<TPluginCapabilityAccess | null> => {
  const row = await db
    .select({ mode: pluginCapabilities.mode })
    .from(pluginCapabilities)
    .where(capabilityWhere(pluginId, type, name))
    .limit(1)
    .get();

  // admin never configured this capability, so the plugin's own default applies
  if (!row) return null;

  if (row.mode !== PluginCapabilityMode.RESTRICTED) {
    return { mode: PluginCapabilityMode.PUBLIC, roleIds: [] };
  }

  const grants = await db
    .select({ roleId: pluginCapabilityRoles.roleId })
    .from(pluginCapabilityRoles)
    .where(
      and(
        eq(pluginCapabilityRoles.pluginId, pluginId),
        eq(pluginCapabilityRoles.type, type),
        eq(pluginCapabilityRoles.name, name)
      )
    );

  return {
    mode: PluginCapabilityMode.RESTRICTED,
    roleIds: grants.map((grant) => grant.roleId)
  };
};

/** every configured capability of a plugin, for the admin screen */
const getPluginCapabilityAccess = async (pluginId: string) => {
  const [modes, grants] = await Promise.all([
    db
      .select({
        type: pluginCapabilities.type,
        name: pluginCapabilities.name,
        mode: pluginCapabilities.mode
      })
      .from(pluginCapabilities)
      .where(eq(pluginCapabilities.pluginId, pluginId)),
    db
      .select({
        type: pluginCapabilityRoles.type,
        name: pluginCapabilityRoles.name,
        roleId: pluginCapabilityRoles.roleId
      })
      .from(pluginCapabilityRoles)
      .where(eq(pluginCapabilityRoles.pluginId, pluginId))
  ]);

  return { modes, grants };
};

const setCapabilityAccess = async (
  pluginId: string,
  type: PluginCapabilityType,
  name: string,
  mode: PluginCapabilityMode,
  roleIds: number[]
) => {
  const now = Date.now();

  // the mode and its grants are one decision: a crash between them would leave
  // grants under a mode that no longer wants them
  db.transaction((tx) => {
    tx.insert(pluginCapabilities)
      .values({ pluginId, type, name, mode, updatedAt: now })
      .onConflictDoUpdate({
        target: [
          pluginCapabilities.pluginId,
          pluginCapabilities.type,
          pluginCapabilities.name
        ],
        set: { mode, updatedAt: now }
      })
      .run();

    tx.delete(pluginCapabilityRoles)
      .where(
        and(
          eq(pluginCapabilityRoles.pluginId, pluginId),
          eq(pluginCapabilityRoles.type, type),
          eq(pluginCapabilityRoles.name, name)
        )
      )
      .run();

    if (mode === PluginCapabilityMode.RESTRICTED && roleIds.length > 0) {
      tx.insert(pluginCapabilityRoles)
        .values(
          roleIds.map((roleId) => ({
            pluginId,
            type,
            name,
            roleId,
            createdAt: now
          }))
        )
        .run();
    }
  });
};

const getCapabilityRows = async () => {
  const [modes, grants] = await Promise.all([
    db
      .select({
        pluginId: pluginCapabilities.pluginId,
        type: pluginCapabilities.type,
        name: pluginCapabilities.name,
        mode: pluginCapabilities.mode
      })
      .from(pluginCapabilities),
    db
      .select({
        pluginId: pluginCapabilityRoles.pluginId,
        type: pluginCapabilityRoles.type,
        name: pluginCapabilityRoles.name,
        roleId: pluginCapabilityRoles.roleId
      })
      .from(pluginCapabilityRoles)
  ]);

  return modes.map((row) => ({
    pluginId: row.pluginId,
    type: row.type,
    name: row.name,
    mode: row.mode,
    roleIds: grants
      .filter(
        (grant) =>
          grant.pluginId === row.pluginId &&
          grant.type === row.type &&
          grant.name === row.name
      )
      .map((grant) => grant.roleId)
  }));
};

const deleteCapabilityAccess = async (
  pluginId: string,
  type: PluginCapabilityType,
  name: string
) => {
  db.transaction((tx) => {
    tx.delete(pluginCapabilityRoles)
      .where(
        and(
          eq(pluginCapabilityRoles.pluginId, pluginId),
          eq(pluginCapabilityRoles.type, type),
          eq(pluginCapabilityRoles.name, name)
        )
      )
      .run();

    tx.delete(pluginCapabilities)
      .where(capabilityWhere(pluginId, type, name))
      .run();
  });
};

const deletePluginCapabilities = async (pluginId: string) => {
  db.transaction((tx) => {
    tx.delete(pluginCapabilityRoles)
      .where(eq(pluginCapabilityRoles.pluginId, pluginId))
      .run();

    tx.delete(pluginCapabilities)
      .where(eq(pluginCapabilities.pluginId, pluginId))
      .run();
  });
};

export {
  deleteCapabilityAccess,
  deletePluginCapabilities,
  getCapabilityAccess,
  getCapabilityRows,
  getPluginCapabilityAccess,
  setCapabilityAccess
};
