import { DESKTOP_BRIDGE_VERSION } from '@sharkord/shared';

const connectDesktop = () => {
  const entry = window.sharkordDesktop;

  if (!entry) {
    return undefined;
  }

  return entry.connect(DESKTOP_BRIDGE_VERSION);
};

// keep this at the module level
const desktopApi = connectDesktop();

const getDesktopApi = () => desktopApi;

export { getDesktopApi };
