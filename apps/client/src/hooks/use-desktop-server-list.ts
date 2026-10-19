import { useCallback, useEffect, useState } from 'react';
import { useDesktopApi } from './use-desktop-api';

export const useDesktopServerList = () => {
  const desktopApi = useDesktopApi();
  const isDesktop = desktopApi !== undefined;
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
