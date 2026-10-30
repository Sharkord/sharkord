import { DESKTOP_PROTOCOL } from '@sharkord/shared';
import { app } from 'electron';
import path from 'path';

const registerProtocol = () => {
  if (process.defaultApp) {
    const [, appPath] = process.argv;

    if (appPath) {
      app.setAsDefaultProtocolClient(DESKTOP_PROTOCOL, process.execPath, [
        path.resolve(appPath)
      ]);
    }

    return;
  }

  app.setAsDefaultProtocolClient(DESKTOP_PROTOCOL);
};

export { registerProtocol };
