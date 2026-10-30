import { app, shell } from 'electron';

const getAppFolder = () => app.getPath('userData');

const openAppFolder = async () => {
  const error = await shell.openPath(getAppFolder());

  if (error) {
    console.error('failed to open the app folder', error);
  }
};

export { getAppFolder, openAppFolder };
