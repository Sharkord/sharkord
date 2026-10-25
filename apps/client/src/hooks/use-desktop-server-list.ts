import { getDesktopApi } from '@/helpers/desktop-api';
import { useCallback, useEffect, useState } from 'react';

export const useDesktopServerList = () => {
  const desktopApi = getDesktopApi();
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
