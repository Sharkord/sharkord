import { OWNER_ROLE_ID } from '@sharkord/shared';
import { getUserRoleIds } from '../../db/queries/roles';
import { assignRole, removeRole } from '../../helpers/user-roles';
import { invariant } from '../../utils/invariant';

const assertNotOwner = async (userId: number, roleId: number) => {
  invariant(roleId !== OWNER_ROLE_ID, {
    code: 'FORBIDDEN',
    message: 'Plugins cannot assign or remove the owner role.'
  });

  const targetRoleIds = await getUserRoleIds(userId);

  invariant(!targetRoleIds.includes(OWNER_ROLE_ID), {
    code: 'FORBIDDEN',
    message: 'Plugins cannot change the roles of the server owner.'
  });
};

const assignPluginUserRole = async (userId: number, roleId: number) => {
  await assertNotOwner(userId, roleId);

  await assignRole(userId, roleId);
};

const removePluginUserRole = async (userId: number, roleId: number) => {
  await assertNotOwner(userId, roleId);

  await removeRole(userId, roleId);
};

export { assignPluginUserRole, removePluginUserRole };
