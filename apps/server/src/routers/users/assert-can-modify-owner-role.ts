import { OWNER_ROLE_ID } from '@sharkord/shared';
import { getUserRoleIds } from '../../db/queries/roles';
import { invariant } from '../../utils/invariant';

const assertCanModifyOwnerRole = async (
  actorUserId: number,
  roleId: number,
  action: 'assign' | 'remove'
) => {
  if (roleId !== OWNER_ROLE_ID) return;

  const actorRoleIds = await getUserRoleIds(actorUserId);

  invariant(actorRoleIds.includes(OWNER_ROLE_ID), {
    code: 'FORBIDDEN',
    message: `Only users with the owner role can ${action} the owner role`
  });
};

export { assertCanModifyOwnerRole };
