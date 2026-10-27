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

    // a pushed change can land first, the initial read must not put it back
    let isPushed = false;

    const unsubscribe = desktopApi.onServerListVisibleChange((pushed) => {
      isPushed = true;

      setIsVisible(pushed);
    });

    desktopApi
      .getServerListVisible()
      .then((visible) => {
        if (!isPushed) {
          setIsVisible(visible);
        }
      })
      .catch(console.error);

    return unsubscribe;
  }, [desktopApi]);

  const toggle = useCallback(() => {
    if (desktopApi) {
      desktopApi.toggleServerList();
    }
  }, [desktopApi]);

  return { isDesktop, isVisible, toggle };
};
