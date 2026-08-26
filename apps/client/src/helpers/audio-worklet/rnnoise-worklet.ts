import {
  createWorkletLoader,
  isAudioWorkletSupported
} from './create-worklet-loader';

const RNNOISE_WORKLET_URL = '/rnnoise/rnnoise-bundle.js';
const RNNOISE_WORKLET_NAME = 'RnnoiseProcessor';
const RNNOISE_SAMPLE_RATE = 48000;
const RNNOISE_READY_TIMEOUT_MS = 10000;
const RNNOISE_CACHE_NAME = 'rnnoise-worklet-v1';

const { ensureLoaded: ensureWorkletLoaded } = createWorkletLoader({
  url: RNNOISE_WORKLET_URL,
  cacheName: RNNOISE_CACHE_NAME,
  errorLabel: 'RNNoise'
});

const waitForReady = (node: AudioWorkletNode) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error('RNNoise worklet timed out waiting for WASM ready signal')
      );
    }, RNNOISE_READY_TIMEOUT_MS);

    node.port.onmessage = (e) => {
      if (e.data === 'ready') {
        clearTimeout(timer);
        resolve();
      }
    };

    node.onprocessorerror = (e) => {
      clearTimeout(timer);
      reject(e);
    };
  });

type TRnnoiseChain = {
  outputTrack: MediaStreamTrack;
  contexts: AudioContext[];
};

const createRnnoiseChain = async (
  inputStream: MediaStream
): Promise<TRnnoiseChain> => {
  if (!isAudioWorkletSupported()) {
    throw new Error('AudioWorklet is not supported in this browser');
  }

  const nativeSampleRate =
    inputStream.getAudioTracks()[0]?.getSettings().sampleRate ?? 48000;

  if (nativeSampleRate !== RNNOISE_SAMPLE_RATE) {
    throw new Error(
      `RNNoise requires a 48kHz audio context (got ${nativeSampleRate}Hz)`
    );
  }

  const ctx = new AudioContext({ sampleRate: nativeSampleRate });
  await ensureWorkletLoaded(ctx);

  // outputChannelCount: [2] allocates a second output channel buffer so the
  // processor can copy ch0 → ch1 and produce centred stereo
  const workletNode = new AudioWorkletNode(ctx, RNNOISE_WORKLET_NAME, {
    outputChannelCount: [2]
  });

  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  await waitForReady(workletNode);

  const source = ctx.createMediaStreamSource(inputStream);
  const destination = ctx.createMediaStreamDestination();

  source.connect(workletNode);
  workletNode.connect(destination);

  const outputTrack = destination.stream.getAudioTracks()[0];

  if (!outputTrack) {
    throw new Error('RNNoise chain produced no output track');
  }

  return { outputTrack, contexts: [ctx] };
};

export { createRnnoiseChain };
