import { t } from '../../utils/trpc';
import { getDirectMessagesRoute } from './get-direct-messages';
import { openDirectMessageRoute } from './open-direct-message';

export const dmsRouter = t.router({
  get: getDirectMessagesRoute,
  open: openDirectMessageRoute
});
