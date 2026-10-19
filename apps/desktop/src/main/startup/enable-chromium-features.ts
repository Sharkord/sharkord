import { app } from 'electron';

// va-api encode and decode on linux, checked against the feature names in electron's chromium
const HARDWARE_VIDEO_CODECS = [
  'AcceleratedVideoEncoder',
  'AcceleratedVideoDecodeLinuxGL',
  'AcceleratedVideoDecodeLinuxZeroCopyGL',
  'VaapiIgnoreDriverChecks'
];

// wayland gives global shortcuts only through the desktop portal, x11, windows and macos ignore it
const GLOBAL_SHORTCUTS = ['GlobalShortcutsPortal'];

const enableChromiumFeatures = () => {
  app.commandLine.appendSwitch(
    'enable-features',
    [...HARDWARE_VIDEO_CODECS, ...GLOBAL_SHORTCUTS].join(',')
  );
};

export { enableChromiumFeatures };
