import { logDebug } from '@/helpers/browser-logger';
import { getTRPCClient } from '@/lib/trpc';
import type { TDirectMessageConversation } from '@sharkord/shared';
import { handleSubscriptionError } from '../subscription-error';
import { upsertDirectMessage } from './actions';

const subscribeToDirectMessages = () => {
  const trpc = getTRPCClient();

  const onConversationUpdateSub = trpc.dms.onConversationUpdate.subscribe(
    undefined,
    {
      onData: (conversation: TDirectMessageConversation) => {
        logDebug('[EVENTS] dms.onConversationUpdate', conversation);
        upsertDirectMessage(conversation);
      },
      onError: handleSubscriptionError('onDmConversationUpdate')
    }
  );

  return () => {
    onConversationUpdateSub.unsubscribe();
  };
};

export { subscribeToDirectMessages };
