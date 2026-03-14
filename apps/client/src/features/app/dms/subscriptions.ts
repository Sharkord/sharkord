import { logDebug } from '@/helpers/browser-logger';
import { getTRPCClient } from '@/lib/trpc';
import { addDmConversation } from '../actions';

const subscribeToDms = () => {
  const trpc = getTRPCClient();

  const onConversationOpenSub = trpc.dms.onConversationOpen.subscribe(
    undefined,
    {
      onData: (conversation) => {
        logDebug('[EVENTS] dms.onConversationOpen', { conversation });
        addDmConversation(conversation);
      },
      onError: (err) =>
        console.error('onConversationOpen subscription error:', err)
    }
  );

  return () => {
    onConversationOpenSub.unsubscribe();
  };
};

export { subscribeToDms };
