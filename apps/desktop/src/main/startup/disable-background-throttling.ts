import { app } from 'electron';

// windows lowers the priority of covered or unfocused windows, which can cause performance issues for screen sharing
const disableBackgroundThrottling = () => {
  app.commandLine.appendSwitch('disable-renderer-backgrounding');
  app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
  app.commandLine.appendSwitch(
    'disable-features',
    'CalculateNativeWinOcclusion'
  );
};

export { disableBackgroundThrottling };
