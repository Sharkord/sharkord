import { app } from 'electron';

// va-api encode and decode on linux, checked against the feature names in electron's chromium
const HARDWARE_VIDEO_CODECS = [
  'AcceleratedVideoEncoder',
  'AcceleratedVideoDecodeLinuxGL',
  'AcceleratedVideoDecodeLinuxZeroCopyGL',
  'VaapiIgnoreDriverChecks'
];

const enableChromiumFeatures = () => {
  app.commandLine.appendSwitch(
    'enable-features',
    HARDWARE_VIDEO_CODECS.join(',')
  );
};

export { enableChromiumFeatures };
