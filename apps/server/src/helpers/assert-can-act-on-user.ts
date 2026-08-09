import { OWNER_ROLE_ID } from '@sharkord/shared';
import { getUserRoleIds } from '../db/queries/roles';
import { invariant } from '../utils/invariant';

// MANAGE_USERS is not a hierarchy: without this guard anyone trusted with user
// moderation can ban, kick or delete the server owner
const assertCanActOnUser = async (
  actorUserId: number,
  targetUserId: number
) => {
  const targetRoleIds = await getUserRoleIds(targetUserId);

  if (!targetRoleIds.includes(OWNER_ROLE_ID)) return;

  const actorRoleIds = await getUserRoleIds(actorUserId);

  invariant(actorRoleIds.includes(OWNER_ROLE_ID), {
    code: 'FORBIDDEN',
    message: 'Only users with the owner role can act on the server owner.'
  });
};

export { assertCanActOnUser };
