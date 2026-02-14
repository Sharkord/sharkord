import { t } from '../../utils/trpc';
import { addChannelRoute } from './add-channel';
import { deleteChannelRoute } from './delete-channel';
import { deletePermissionsRoute } from './delete-permissions';
import {
  onChannelCreateRoute,
  onChannelDeleteRoute,
  onChannelPermissionsUpdateRoute,
  onChannelReadStatesDeltaRoute,
  onChannelReadStatesUpdateRoute,
  onChannelUpdateRoute
} from './events';
import { getChannelRoute } from './get-channel';
import { getPermissionsRoute } from './get-permissions';
import { markAsReadRoute } from './mark-as-read';
import { reorderChannelsRoute } from './reorder-channels';
import { rotateFileAccessTokenRoute } from './rotate-file-access-token';
import { updateChannelRoute } from './update-channel';
import { updatePermissionsRoute } from './update-permission';

export const channelsRouter = t.router({
  add: addChannelRoute,
  update: updateChannelRoute,
  delete: deleteChannelRoute,
  get: getChannelRoute,
  updatePermissions: updatePermissionsRoute,
  getPermissions: getPermissionsRoute,
  deletePermissions: deletePermissionsRoute,
  reorder: reorderChannelsRoute,
  markAsRead: markAsReadRoute,
  rotateFileAccessToken: rotateFileAccessTokenRoute,
  onCreate: onChannelCreateRoute,
  onDelete: onChannelDeleteRoute,
  onUpdate: onChannelUpdateRoute,
  onPermissionsUpdate: onChannelPermissionsUpdateRoute,
  onReadStateUpdate: onChannelReadStatesUpdateRoute,
  onReadStateDelta: onChannelReadStatesDeltaRoute
});
