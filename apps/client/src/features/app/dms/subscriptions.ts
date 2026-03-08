import { logDebug } from '@/helpers/browser-logger';
import { getTRPCClient } from '@/lib/trpc';
import { fetchDmConversations } from '../actions';

const subscribeToDms = () => {
  const trpc = getTRPCClient();

  const onConversationOpenSub = trpc.dms.onConversationOpen.subscribe(
    undefined,
    {
      onData: () => {
        logDebug('[EVENTS] dms.onConversationOpen');
        fetchDmConversations();
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
