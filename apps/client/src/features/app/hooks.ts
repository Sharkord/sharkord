import { useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  appLoadingSelector,
  devicesSelector,
  loadingPluginsSelector,
  modViewOpenSelector,
  modViewUserIdSelector
} from './selectors';

export const useIsAppLoading = () => useSelector(appLoadingSelector);

export const useIsPluginsLoading = () => useSelector(loadingPluginsSelector);

export const useDevices = () => useSelector(devicesSelector);

export const useModViewOpen = () => {
  const isOpen = useSelector(modViewOpenSelector);
  const userId = useSelector(modViewUserIdSelector);

  return useMemo(() => ({ isOpen, userId }), [isOpen, userId]);
};
