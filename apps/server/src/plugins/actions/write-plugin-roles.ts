import { OWNER_ROLE_ID, type TJoinedRole } from '@sharkord/shared';
import {
  createRole,
  loadRole,
  updateRole,
  type TCreateRole,
  type TUpdateRole
} from '../../helpers/roles';
import { invariant } from '../../utils/invariant';

const PLUGIN_ACTOR = null;

const createPluginRole = (input: TCreateRole): Promise<TJoinedRole> =>
  createRole(input, PLUGIN_ACTOR);

const updatePluginRole = async (
  roleId: number,
  values: TUpdateRole
): Promise<TJoinedRole> => {
  invariant(roleId !== OWNER_ROLE_ID, {
    code: 'FORBIDDEN',
    message: 'Plugins cannot change the owner role.'
  });

  const role = await loadRole(roleId);

  return updateRole(role, values, PLUGIN_ACTOR);
};

export { createPluginRole, updatePluginRole };
