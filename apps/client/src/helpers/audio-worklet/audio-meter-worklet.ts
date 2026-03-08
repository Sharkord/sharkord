import audioMeterProcessorUrl from '@/audio-worklets/audio-meter-processor.js?url';
import { MICROPHONE_AUDIO_METER_WORKLET_NAME } from '@/helpers/audio-gate';

type TAudioMeterWorkletConfig = {
  enabled?: boolean;
  updateIntervalMs?: number;
};

const workletLoadPromises = new WeakMap<BaseAudioContext, Promise<void>>();

const isAudioWorkletSupported = () => {
  if (typeof window === 'undefined') return false;

  return (
    typeof window.AudioWorkletNode !== 'undefined' &&
    typeof window.AudioContext !== 'undefined' &&
    'audioWorklet' in window.AudioContext.prototype
  );
};

const postAudioMeterWorkletConfig = (
  node: AudioWorkletNode,
  config: TAudioMeterWorkletConfig
) => {
  node.port.postMessage({
    type: 'config',
    enabled: config.enabled,
    updateIntervalMs: config.updateIntervalMs
  });
};

const ensureAudioMeterWorkletLoaded = async (audioContext: AudioContext) => {
  if (!isAudioWorkletSupported()) {
    throw new Error('AudioWorklet is not supported in this browser.');
  }

  let loadPromise = workletLoadPromises.get(audioContext);

  if (!loadPromise) {
    loadPromise = audioContext.audioWorklet.addModule(audioMeterProcessorUrl);
    workletLoadPromises.set(audioContext, loadPromise);
  }

  await loadPromise;
};

const createAudioMeterWorkletNode = async (
  audioContext: AudioContext,
  config: TAudioMeterWorkletConfig = {}
) => {
  await ensureAudioMeterWorkletLoaded(audioContext);

  const node = new AudioWorkletNode(
    audioContext,
    MICROPHONE_AUDIO_METER_WORKLET_NAME
  );

  postAudioMeterWorkletConfig(node, config);

  return node;
};

export { createAudioMeterWorkletNode, postAudioMeterWorkletConfig };
