import {
  createWorkletLoader,
  isAudioWorkletSupported
} from './create-worklet-loader';

const DTLN_WORKLET_URL = '/dtln/dtln-processor.js';
const DTLN_WORKLET_NAME = 'DtlnProcessor';

const DTLN_READY_TIMEOUT_MS = 10000;

const isDtlnWorkletSupported = isAudioWorkletSupported;

const DTLN_CACHE_NAME = 'dtln-worklet-v3';

const { ensureLoaded: ensureWorkletLoaded } = createWorkletLoader({
  url: DTLN_WORKLET_URL,
  cacheName: DTLN_CACHE_NAME,
  errorLabel: 'DTLN'
});

const waitForReady = (node: AudioWorkletNode) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('DTLN worklet timed out waiting for WASM ready signal'));
    }, DTLN_READY_TIMEOUT_MS);

    node.port.onmessage = (e) => {
      if (typeof e.data === 'string' && e.data.startsWith('ready:')) {
        clearTimeout(timer);
        resolve();
      }
    };

    node.onprocessorerror = (e) => {
      clearTimeout(timer);
      reject(e);
    };
  });

type TDtlnChain = {
  outputTrack: MediaStreamTrack;
  contexts: AudioContext[];
};

const createDtlnChain = async (
  inputStream: MediaStream
): Promise<TDtlnChain> => {
  if (!isDtlnWorkletSupported()) {
    throw new Error('AudioWorklet is not supported in this browser');
  }

  const ctx = new AudioContext({ sampleRate: 16000 });
  await ensureWorkletLoaded(ctx);
  const workletNode = new AudioWorkletNode(ctx, DTLN_WORKLET_NAME);

  const source = ctx.createMediaStreamSource(inputStream);
  const destination = ctx.createMediaStreamDestination();

  source.connect(workletNode);
  workletNode.connect(destination);

  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  await waitForReady(workletNode);

  const outputTrack = destination.stream.getAudioTracks()[0];

  if (!outputTrack) {
    throw new Error('DTLN chain produced no output track');
  }

  return { outputTrack, contexts: [ctx] };
};

export { createDtlnChain, isDtlnWorkletSupported };
