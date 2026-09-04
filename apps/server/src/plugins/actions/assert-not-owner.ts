import { OWNER_ROLE_ID } from '@sharkord/shared';
import { getUserRoleIds } from '../../db/queries/roles';
import { invariant } from '../../utils/invariant';

const assertNotOwner = async (userId: number, action: string) => {
  const targetRoleIds = await getUserRoleIds(userId);

  invariant(!targetRoleIds.includes(OWNER_ROLE_ID), {
    code: 'FORBIDDEN',
    message: `Plugins cannot ${action} the server owner.`
  });
};

export { assertNotOwner };
