import { useCallback, useEffect, useState } from 'react';
import { useDesktopApi } from './use-desktop-api';
import { useIsDesktopApp } from './use-is-desktop-app';

export const useDesktopServerList = () => {
  const desktopApi = useDesktopApi();
  const isDesktop = useIsDesktopApp();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (!desktopApi) {
      return;
    }

    const load = async () => {
      const visible = await desktopApi.getServerListVisible();

      setIsVisible(visible);
    };

    load();

    return desktopApi.onServerListVisibleChange(setIsVisible);
  }, [desktopApi]);

  const toggle = useCallback(() => {
    if (desktopApi) {
      desktopApi.toggleServerList();
    }
  }, [desktopApi]);

  return { isDesktop, isVisible, toggle };
};
