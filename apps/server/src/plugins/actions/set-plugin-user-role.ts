import { OWNER_ROLE_ID } from '@sharkord/shared';
import { getRole } from '../../db/queries/roles';
import { assignRole, removeRole } from '../../helpers/user-roles';
import { invariant } from '../../utils/invariant';
import { assertNotOwner } from './assert-not-owner';

const loadAllowedRole = async (userId: number, roleId: number) => {
  invariant(roleId !== OWNER_ROLE_ID, {
    code: 'FORBIDDEN',
    message: 'Plugins cannot assign or remove the owner role.'
  });

  await assertNotOwner(userId, 'change the roles of');

  const role = await getRole(roleId);

  invariant(role, {
    code: 'NOT_FOUND',
    message: 'Role not found'
  });

  return role;
};

const assignPluginUserRole = async (userId: number, roleId: number) => {
  await assignRole(userId, await loadAllowedRole(userId, roleId));
};

const removePluginUserRole = async (userId: number, roleId: number) => {
  await removeRole(userId, await loadAllowedRole(userId, roleId));
};

export { assignPluginUserRole, removePluginUserRole };
