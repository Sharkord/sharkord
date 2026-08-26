import audioMeterProcessorUrl from '@/audio-worklets/audio-meter-processor.js?url';
import { MICROPHONE_AUDIO_METER_WORKLET_NAME } from '@/helpers/audio-gate';
import { createWorkletLoader } from './create-worklet-loader';

type TAudioMeterWorkletConfig = {
  enabled?: boolean;
  updateIntervalMs?: number;
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

const { ensureLoaded: ensureAudioMeterWorkletLoaded } = createWorkletLoader({
  url: audioMeterProcessorUrl,
  errorLabel: 'audio meter'
});

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
