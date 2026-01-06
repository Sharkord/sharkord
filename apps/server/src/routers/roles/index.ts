import { t } from '../../utils/trpc';
import { addRoleRoute } from './add-role';
import { deleteRoleRoute } from './delete-role';
import {
  onRoleCreateRoute,
  onRoleDeleteRoute,
  onRoleUpdateRoute
} from './events';
import { getRolesRouter } from './get-roles';
import { setDefaultRoleRoute } from './set-default-role';
import { updateRoleRoute } from './update-role';

export const rolesRouter = t.router({
  add: addRoleRoute,
  update: updateRoleRoute,
  delete: deleteRoleRoute,
  setDefault: setDefaultRoleRoute,
  getAll: getRolesRouter,
  onCreate: onRoleCreateRoute,
  onDelete: onRoleDeleteRoute,
  onUpdate: onRoleUpdateRoute
});
