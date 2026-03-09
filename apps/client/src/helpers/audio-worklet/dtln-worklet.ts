const DTLN_WORKLET_URL = '/dtln/dtln-processor.js';
const DTLN_WORKLET_NAME = 'DtlnProcessor';

const DTLN_READY_TIMEOUT_MS = 10000;

const isDtlnWorkletSupported = () => {
  if (typeof window === 'undefined') return false;

  return !!(window.AudioWorkletNode && window.AudioContext);
};

const DTLN_CACHE_NAME = 'dtln-worklet-v1';

// resolves to a blob url for the worklet script -- within a session the same
// promise is reused (no re-fetch, no re-parse); across page loads the response
// is served from the Cache API
let dtlnBlobUrlPromise: Promise<string> | null = null;

const getDtlnBlobUrl = (): Promise<string> => {
  if (!dtlnBlobUrlPromise) {
    dtlnBlobUrlPromise = caches
      .open(DTLN_CACHE_NAME)
      .then(async (cache) => {
        let response = await cache.match(DTLN_WORKLET_URL);

        if (!response) {
          await cache.add(DTLN_WORKLET_URL);
          response = await cache.match(DTLN_WORKLET_URL);
        }

        if (!response) {
          throw new Error('failed to cache DTLN worklet');
        }

        return response.blob();
      })
      .then((blob) => URL.createObjectURL(blob));
  }

  return dtlnBlobUrlPromise;
};

// keyed on context instance to avoid duplicate addModule calls on the same
// context instance
const workletLoadPromises = new Map<BaseAudioContext, Promise<void>>();

const ensureWorkletLoaded = async (audioContext: AudioContext) => {
  if (!isDtlnWorkletSupported()) {
    throw new Error('AudioWorklet is not supported in this browser');
  }

  let loadPromise = workletLoadPromises.get(audioContext);

  if (!loadPromise) {
    loadPromise = getDtlnBlobUrl().then((blobUrl) =>
      audioContext.audioWorklet.addModule(blobUrl)
    );
    workletLoadPromises.set(audioContext, loadPromise);
  }

  await loadPromise;
};

const waitForReady = (node: AudioWorkletNode) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('DTLN worklet timed out waiting for WASM ready signal'));
    }, DTLN_READY_TIMEOUT_MS);

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

  const nativeSampleRate =
    inputStream.getAudioTracks()[0]?.getSettings().sampleRate ?? 48000;
  const ctx = new AudioContext({ sampleRate: nativeSampleRate });
  await ensureWorkletLoaded(ctx);
  const workletNode = new AudioWorkletNode(ctx, DTLN_WORKLET_NAME);
  await waitForReady(workletNode);

  const source = ctx.createMediaStreamSource(inputStream);
  const destination = ctx.createMediaStreamDestination();

  source.connect(workletNode);
  workletNode.connect(destination);

  const outputTrack = destination.stream.getAudioTracks()[0];

  if (!outputTrack) {
    throw new Error('DTLN chain produced no output track');
  }

  return { outputTrack, contexts: [ctx] };
};

export { createDtlnChain, isDtlnWorkletSupported };
