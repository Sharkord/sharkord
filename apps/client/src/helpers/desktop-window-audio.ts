import processorUrl from '@/audio-worklets/window-audio-processor.js?url';
import { createWorkletLoader } from './audio-worklet/create-worklet-loader';
import { getDesktopApi } from './desktop-api';

const { ensureLoaded } = createWorkletLoader({
  url: processorUrl,
  errorLabel: 'window audio'
});
let cleanup: (() => void) | undefined;

const stopDesktopWindowAudio = () => {
  cleanup?.();
  cleanup = undefined;
};

const getDesktopWindowAudioTrack = async () => {
  const desktop = getDesktopApi();
  if (!desktop) return undefined;
  stopDesktopWindowAudio();
  const context = new AudioContext({ sampleRate: 48000 });
  let node: AudioWorkletNode | undefined;
  let unsubscribe: (() => void) | undefined;
  let track: MediaStreamTrack | undefined;
  let stopped = false;
  const release = () => {
    if (stopped) return;
    stopped = true;
    unsubscribe?.();
    track?.stop();
    node?.disconnect();
    context.close().catch(() => {});
  };
  cleanup = release;
  try {
    await ensureLoaded(context);
    if (stopped) return undefined;
    node = new AudioWorkletNode(context, 'window-audio', {
      numberOfInputs: 0,
      outputChannelCount: [2]
    });
    const destination = context.createMediaStreamDestination();
    node.connect(destination);
    [track] = destination.stream.getAudioTracks();
    unsubscribe = desktop.onWindowAudio((data) => {
      if (data === null) {
        release();
        return;
      }
      node?.port.postMessage(data);
    });
    await context.resume();
    if (stopped) return undefined;
    const started = await desktop.startWindowAudio();
    if (!started || stopped) {
      release();
      return undefined;
    }
    return track;
  } catch (error) {
    release();
    throw error;
  }
};

export { getDesktopWindowAudioTrack, stopDesktopWindowAudio };
