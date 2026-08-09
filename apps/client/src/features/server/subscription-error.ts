import { store } from '../store';
import { serverSliceActions } from './slice';

export const handleSubscriptionError =
  (subscriptionName: string) => (error: unknown) => {
    console.error(`${subscriptionName} subscription error:`, error);

    store.dispatch(serverSliceActions.setConnected(false));
  };
