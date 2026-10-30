import { getDesktopApi } from './desktop-api';

const isDesktopApp = () => {
  return getDesktopApi() !== undefined;
};

export { isDesktopApp };
