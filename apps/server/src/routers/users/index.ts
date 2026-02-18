import { t } from '../../utils/trpc';
import { addRoleRoute } from './add-role';
import { banRoute } from './ban';
import { changeAvatarRoute } from './change-avatar';
import { changeBannerRoute } from './change-banner';
import { deleteUserRoute } from './delete-user';
import {
  onUserCreateRoute,
  onUserDeleteRoute,
  onUserJoinRoute,
  onUserLeaveRoute,
  onUserUpdateRoute
} from './events';
import { getUserInfoRoute } from './get-user-info';
import { getUsersRoute } from './get-users';
import { kickRoute } from './kick';
import { removeRoleRoute } from './remove-role';
import { unbanRoute } from './unban';
import { updatePasswordRoute } from './update-password';
import { updateUserRoute } from './update-user';

export const usersRouter = t.router({
  changeAvatar: changeAvatarRoute,
  changeBanner: changeBannerRoute,
  addRole: addRoleRoute,
  removeRole: removeRoleRoute,
  update: updateUserRoute,
  updatePassword: updatePasswordRoute,
  getInfo: getUserInfoRoute,
  getAll: getUsersRoute,
  kick: kickRoute,
  ban: banRoute,
  unban: unbanRoute,
  delete: deleteUserRoute,
  onJoin: onUserJoinRoute,
  onLeave: onUserLeaveRoute,
  onUpdate: onUserUpdateRoute,
  onCreate: onUserCreateRoute,
  onDelete: onUserDeleteRoute
});
