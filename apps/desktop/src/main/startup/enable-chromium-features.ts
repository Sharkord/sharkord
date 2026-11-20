import { app } from 'electron';

// va-api encode and decode on linux, checked against the feature names in electron's chromium
const HARDWARE_VIDEO_CODECS = [
  'AcceleratedVideoEncoder',
  'AcceleratedVideoDecodeLinuxGL',
  'AcceleratedVideoDecodeLinuxZeroCopyGL',
  'VaapiIgnoreDriverChecks'
];

const enableChromiumFeatures = () => {
  const userValue = app.commandLine.getSwitchValue('enable-features');
  const userFeatures = userValue.split(',');
  const features = new Set([...userFeatures, ...HARDWARE_VIDEO_CODECS]);

  features.delete('');

  app.commandLine.appendSwitch('enable-features', [...features].join(','));
};

export { enableChromiumFeatures };
