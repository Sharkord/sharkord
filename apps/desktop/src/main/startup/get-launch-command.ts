import path from 'path';

const getLaunchCommand = () => {
  if (process.defaultApp) {
    const [, appPath] = process.argv;

    return appPath
      ? [process.execPath, path.resolve(appPath)]
      : [process.execPath];
  }

  return [process.env.APPIMAGE ?? process.execPath];
};

const getDesktopExec = () =>
  getLaunchCommand()
    .map((part) => `"${part}"`)
    .join(' ');

export { getDesktopExec, getLaunchCommand };
