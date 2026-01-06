import type { ServerScreen } from '@/components/server-screens/screens';
import type { TGenericObject } from '@sharkord/shared';
import { store } from '../store';
import { serverScreenSliceActions } from './slice';

export const openServerScreen = (
  serverScreen: ServerScreen,
  props?: TGenericObject
) => {
  store.dispatch(
    serverScreenSliceActions.openServerScreen({ serverScreen, props })
  );
};

export const closeServerScreens = () => {
  store.dispatch(serverScreenSliceActions.closeServerScreens());
};

export const resetServerScreens = () => {
  store.dispatch(serverScreenSliceActions.resetServerScreens());
};
