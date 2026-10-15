import { OWNER_ROLE_ID, type TInvite } from '@sharkord/shared';
import { getPublicUserById } from '../../db/queries/users';
import { createInvite, type TCreateInvite } from '../../helpers/invites';
import { invariant } from '../../utils/invariant';

type TCreatePluginInvite = TCreateInvite & { creatorId: number };

const createPluginInvite = async ({
  creatorId,
  ...input
}: TCreatePluginInvite): Promise<TInvite> => {
  invariant(input.roleId !== OWNER_ROLE_ID, {
    code: 'FORBIDDEN',
    message: 'Plugins cannot create invites for the owner role.'
  });

  const creator = await getPublicUserById(creatorId);

  invariant(creator, {
    code: 'NOT_FOUND',
    message: 'User not found'
  });

  return createInvite(input, creatorId, null);
};

export { createPluginInvite };
export type { TCreatePluginInvite };
