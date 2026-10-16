import { t } from '../../utils/trpc';
import { onThreadFollowUpdateRoute } from './events';
import { getFollowedThreadsRoute } from './get-followed';
import { markThreadAsReadRoute } from './mark-as-read';
import { setThreadFollowRoute } from './set-follow';

export const threadsRouter = t.router({
  getFollowed: getFollowedThreadsRoute,
  setFollow: setThreadFollowRoute,
  markAsRead: markThreadAsReadRoute,
  onFollowUpdate: onThreadFollowUpdateRoute
});
