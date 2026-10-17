import { useDesktopApi } from './use-desktop-api';

export const useIsDesktopApp = () => {
  const desktopApi = useDesktopApi();

  return !!desktopApi;
};
