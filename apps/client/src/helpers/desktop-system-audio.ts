import { voiceLogger } from './browser-logger';
import { sleep } from './sleep';

// from https://github.com/Vencord/venmic
const VIRTUAL_MIC_LABEL = 'vencord-screen-share';

const DEVICE_POLL_ATTEMPTS = 20;
const DEVICE_POLL_INTERVAL_MS = 100;

const findVirtualMicId = async () => {
  for (let attempt = 0; attempt < DEVICE_POLL_ATTEMPTS; attempt++) {
    const devices = await navigator.mediaDevices.enumerateDevices();

    const virtualMic = devices.find(
      ({ kind, label }) => kind === 'audioinput' && label === VIRTUAL_MIC_LABEL
    );

    if (virtualMic) {
      voiceLogger.info('screen audio: found virtual microphone', virtualMic);

      return virtualMic.deviceId;
    }

    await sleep(DEVICE_POLL_INTERVAL_MS);
  }

  return undefined;
};

const getDesktopSystemAudioTrack = async () => {
  const desktopApi = window.sharkordDesktop;

  if (!desktopApi) {
    return undefined;
  }

  try {
    const started = await desktopApi.startSystemAudio();

    if (!started) {
      return undefined;
    }

    const deviceId = await findVirtualMicId();

    if (!deviceId) {
      voiceLogger.warn('screen audio: virtual microphone never appeared');

      await desktopApi.stopSystemAudio();

      return undefined;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: { exact: deviceId },
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 2,
        sampleRate: 48000
      }
    });

    const [track] = stream.getAudioTracks();

    return track;
  } catch (error) {
    voiceLogger.error('screen audio: system audio capture failed', error);
    await desktopApi.stopSystemAudio();

    return undefined;
  }
};

const stopDesktopSystemAudio = () => {
  const desktopApi = window.sharkordDesktop;

  if (!desktopApi) {
    return;
  }

  desktopApi.stopSystemAudio().catch((error) => {
    voiceLogger.error('screen audio: stopping system audio failed', error);
  });
};

export { getDesktopSystemAudioTrack, stopDesktopSystemAudio };
