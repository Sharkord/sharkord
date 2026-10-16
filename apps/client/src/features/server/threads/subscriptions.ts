import { logDebug } from '@/helpers/browser-logger';
import { getTRPCClient } from '@/lib/trpc';
import type { TThreadFollowUpdate } from '@sharkord/shared';
import { handleSubscriptionError } from '../subscription-error';
import { applyThreadFollowUpdate } from './actions';

const subscribeToThreads = () => {
  const trpc = getTRPCClient();

  const onFollowUpdateSub = trpc.threads.onFollowUpdate.subscribe(undefined, {
    onData: (update: TThreadFollowUpdate) => {
      logDebug('[EVENTS] threads.onFollowUpdate', update);
      applyThreadFollowUpdate(update);
    },
    onError: handleSubscriptionError('onThreadFollowUpdate')
  });

  return () => {
    onFollowUpdateSub.unsubscribe();
  };
};

export { subscribeToThreads };
