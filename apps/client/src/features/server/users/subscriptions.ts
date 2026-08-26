import { logDebug } from '@/helpers/browser-logger';
import { getTRPCClient } from '@/lib/trpc';
import { UserStatus, type TJoinedPublicUser } from '@sharkord/shared';
import { handleSubscriptionError } from '../subscription-error';
import {
  addUser,
  handleUserJoin,
  reassignUser,
  updateUser,
  wipeUser
} from './actions';

const subscribeToUsers = () => {
  const trpc = getTRPCClient();

  const onUserJoinSub = trpc.users.onJoin.subscribe(undefined, {
    onData: (user: TJoinedPublicUser) => {
      logDebug('[EVENTS] users.onJoin', { user });
      handleUserJoin(user);
    },
    onError: handleSubscriptionError('onUserJoin')
  });

  const onUserCreateSub = trpc.users.onCreate.subscribe(undefined, {
    onData: (user: TJoinedPublicUser) => {
      logDebug('[EVENTS] users.onCreate', { user });
      addUser(user);
    },
    onError: handleSubscriptionError('onUserCreate')
  });

  const onUserLeaveSub = trpc.users.onLeave.subscribe(undefined, {
    onData: (userId: number) => {
      logDebug('[EVENTS] users.onLeave', { userId });
      updateUser(userId, { status: UserStatus.OFFLINE });
    },
    onError: handleSubscriptionError('onUserLeave')
  });

  const onUserUpdateSub = trpc.users.onUpdate.subscribe(undefined, {
    onData: (user: TJoinedPublicUser) => {
      logDebug('[EVENTS] users.onUpdate', { user });
      updateUser(user.id, user);
    },
    onError: handleSubscriptionError('onUserUpdate')
  });

  const onUserDeleteSub = trpc.users.onDelete.subscribe(undefined, {
    onData: ({ isWipe, userId, deletedUserId }) => {
      logDebug('[EVENTS] users.onDelete', { isWipe, userId, deletedUserId });

      if (isWipe) {
        wipeUser(userId);
      } else {
        reassignUser(userId, deletedUserId);
      }
    },
    onError: handleSubscriptionError('onUserDelete')
  });

  return () => {
    onUserJoinSub.unsubscribe();
    onUserLeaveSub.unsubscribe();
    onUserUpdateSub.unsubscribe();
    onUserCreateSub.unsubscribe();
    onUserDeleteSub.unsubscribe();
  };
};

export { subscribeToUsers };
