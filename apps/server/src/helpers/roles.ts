import {
  ActivityLogType,
  HEX_COLOR_REGEX,
  OWNER_ROLE_ID,
  Permission,
  STORAGE_MAX_QUOTA_PER_USER,
  STORAGE_MIN_QUOTA_PER_USER,
  type TJoinedRole
} from '@sharkord/shared';
import { count, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db';
import { syncRolePermissions } from '../db/mutations/roles';
import { publishRole } from '../db/publishers';
import { getRole } from '../db/queries/roles';
import { roles } from '../db/schema';
import { eventBus } from '../plugins/event-bus';
import { enqueueActivityLog } from '../queues/activity-log';
import { invariant } from '../utils/invariant';

const MAX_ROLES = 100;

const zRoleName = z.string().min(1).max(26);
const zRoleColor = z.string().regex(HEX_COLOR_REGEX, 'Invalid hex color');
const zRolePermissions = z.enum(Permission).array();

const zCreateRole = z.object({
  name: zRoleName,
  color: zRoleColor.optional(),
  permissions: zRolePermissions.optional()
});

const zUpdateRole = z.object({
  name: zRoleName.optional(),
  color: zRoleColor.optional(),
  permissions: zRolePermissions.optional(),
  storageQuotaOverrideEnabled: z.boolean().optional(),
  storageSpaceQuota: z
    .number()
    .min(STORAGE_MIN_QUOTA_PER_USER)
    .max(STORAGE_MAX_QUOTA_PER_USER)
    .optional()
});

type TCreateRole = z.infer<typeof zCreateRole>;
type TUpdateRole = z.infer<typeof zUpdateRole>;

const loadRole = async (roleId: number): Promise<TJoinedRole> => {
  const role = await getRole(roleId);

  invariant(role, {
    code: 'NOT_FOUND',
    message: 'Role not found.'
  });

  return role;
};

const createRole = async (
  input: TCreateRole,
  userId: number | null
): Promise<TJoinedRole> => {
  const values = zCreateRole.parse(input);

  const existing = await db.select({ total: count() }).from(roles).get();

  invariant((existing?.total ?? 0) < MAX_ROLES, {
    code: 'BAD_REQUEST',
    message: `This server cannot have more than ${MAX_ROLES} roles.`
  });

  const role = await db
    .insert(roles)
    .values({
      name: values.name,
      color: values.color ?? '#ffffff',
      isDefault: false,
      isPersistent: false,
      storageQuotaOverrideEnabled: false,
      storageSpaceQuota: 0,
      createdAt: Date.now()
    })
    .returning()
    .get();

  if (values.permissions && values.permissions.length > 0) {
    await syncRolePermissions(role.id, values.permissions);
  }

  publishRole(role.id, 'create');

  eventBus.emit('role:created', { roleId: role.id, name: role.name });

  enqueueActivityLog({
    type: ActivityLogType.CREATED_ROLE,
    userId,
    details: {
      roleId: role.id,
      roleName: role.name
    }
  });

  return loadRole(role.id);
};

const updateRole = async (
  role: TJoinedRole,
  input: TUpdateRole,
  userId: number | null
): Promise<TJoinedRole> => {
  const { permissions, ...values } = zUpdateRole.parse(input);

  if (Object.keys(values).length > 0) {
    await db.update(roles).set(values).where(eq(roles.id, role.id));
  }

  if (permissions && role.id !== OWNER_ROLE_ID) {
    await syncRolePermissions(role.id, permissions);
  }

  const updatedRole = await loadRole(role.id);

  publishRole(updatedRole.id, 'update');

  eventBus.emit('role:updated', {
    roleId: updatedRole.id,
    name: updatedRole.name
  });

  enqueueActivityLog({
    type: ActivityLogType.UPDATED_ROLE,
    userId,
    details: {
      roleId: updatedRole.id,
      permissions: updatedRole.permissions,
      values
    }
  });

  return updatedRole;
};

export { createRole, loadRole, updateRole };
export type { TCreateRole, TUpdateRole };
