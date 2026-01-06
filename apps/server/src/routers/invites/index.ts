import { t } from '../../utils/trpc';
import { addInviteRoute } from './add-invite';
import { deleteInviteRoute } from './delete-invite';
import { getInvitesRoute } from './get-invites';

export const invitesRouter = t.router({
  add: addInviteRoute,
  delete: deleteInviteRoute,
  getAll: getInvitesRoute
});
