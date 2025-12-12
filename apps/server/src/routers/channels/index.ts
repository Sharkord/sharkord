import { t } from '../../utils/trpc';
import { addChannelRoute } from './add-channel';
import { deleteChannelRoute } from './delete-channel';
import {
  onChannelCreateRoute,
  onChannelDeleteRoute,
  onChannelUpdateRoute
} from './events';
import { getChannelRoute } from './get-channel';
import { reorderChannelsRoute } from './reorder-channels';
import { updateChannelRoute } from './update-channel';

export const channelsRouter = t.router({
  add: addChannelRoute,
  update: updateChannelRoute,
  delete: deleteChannelRoute,
  get: getChannelRoute,
  reorder: reorderChannelsRoute,
  onCreate: onChannelCreateRoute,
  onDelete: onChannelDeleteRoute,
  onUpdate: onChannelUpdateRoute
});
