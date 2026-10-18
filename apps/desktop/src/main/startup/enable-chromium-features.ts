import { app } from 'electron';

// windows has loopback audio built in, macos (13+) and linux (pulseaudio) need these
const SYSTEM_AUDIO_CAPTURE = [
  'MacLoopbackAudioForScreenShare',
  'PulseaudioLoopbackForScreenShare'
];

// va-api encode and decode on linux, names this chromium does not know are ignored
const HARDWARE_VIDEO_CODECS = [
  'AcceleratedVideoEncoder',
  'VaapiVideoEncoder',
  'AcceleratedVideoDecodeLinuxGL',
  'AcceleratedVideoDecodeLinuxZeroCopyGL',
  'VaapiIgnoreDriverChecks'
];

const enableChromiumFeatures = () => {
  const features = [...SYSTEM_AUDIO_CAPTURE, ...HARDWARE_VIDEO_CODECS];

  app.commandLine.appendSwitch('enable-features', features.join(','));
};

export { enableChromiumFeatures };
