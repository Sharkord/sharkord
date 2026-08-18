type TWorkletLoaderOptions = {
  url: string;
  cacheName?: string;
  errorLabel: string;
};

const isAudioWorkletSupported = () => {
  if (typeof window === 'undefined') return false;

  return (
    typeof window.AudioWorkletNode !== 'undefined' &&
    typeof window.AudioContext !== 'undefined' &&
    'audioWorklet' in window.AudioContext.prototype
  );
};

const createWorkletLoader = ({
  url,
  cacheName,
  errorLabel
}: TWorkletLoaderOptions) => {
  let sourceUrlPromise: Promise<string> | null = null;

  const loadPromises = new WeakMap<BaseAudioContext, Promise<void>>();

  const getSourceUrl = (): Promise<string> => {
    if (!cacheName) return Promise.resolve(url);

    if (!sourceUrlPromise) {
      sourceUrlPromise = caches
        .open(cacheName)
        .then(async (cache) => {
          let response = await cache.match(url);

          if (!response) {
            await cache.add(url);
            response = await cache.match(url);
          }

          if (!response) {
            throw new Error(`failed to cache ${errorLabel} worklet`);
          }

          return response.blob();
        })
        .then((blob) => URL.createObjectURL(blob));
    }

    return sourceUrlPromise;
  };

  const ensureLoaded = async (audioContext: AudioContext) => {
    if (!isAudioWorkletSupported()) {
      throw new Error('AudioWorklet is not supported in this browser');
    }

    let loadPromise = loadPromises.get(audioContext);

    if (!loadPromise) {
      loadPromise = getSourceUrl().then((sourceUrl) =>
        audioContext.audioWorklet.addModule(sourceUrl)
      );

      loadPromises.set(audioContext, loadPromise);
    }

    await loadPromise;
  };

  return { ensureLoaded };
};

export { createWorkletLoader, isAudioWorkletSupported };
