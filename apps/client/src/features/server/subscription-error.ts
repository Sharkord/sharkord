import { pushVoiceDebugEvent } from '@/helpers/voice-debug';
import { store } from '../store';
import { serverSliceActions } from './slice';

export const handleSubscriptionError =
  (subscriptionName: string) => (error: unknown) => {
    console.error(`${subscriptionName} subscription error:`, error);

    pushVoiceDebugEvent('error', `${subscriptionName} subscription error`, {
      error: String(error)
    });

    store.dispatch(serverSliceActions.setConnected(false));
  };
