import {
  MICROPHONE_GATE_CLOSE_HOLD_MS,
  MICROPHONE_NOISE_GATE_WORKLET_NAME
} from '@/helpers/audio-gate';
import noiseGateProcessorUrl from '@/audio-worklets/noise-gate-processor.js?url';

type TNoiseGateWorkletConfig = {
  enabled?: boolean;
  thresholdDb?: number;
  holdMs?: number;
};

type TNoiseGateWorkletAvailability = {
  available: boolean;
  reason?: string;
};

const workletLoadPromises = new WeakMap<BaseAudioContext, Promise<void>>();
const availabilitySubscribers = new Set<() => void>();
let runtimeUnavailableReason: string | undefined;
let availabilitySnapshotCache: TNoiseGateWorkletAvailability | null = null;

const notifyAvailabilitySubscribers = () => {
  availabilitySubscribers.forEach((listener) => listener());
};

const isNoiseGateWorkletSupported = () => {
  if (typeof window === 'undefined') return false;

  return (
    typeof window.AudioWorkletNode !== 'undefined' &&
    typeof window.AudioContext !== 'undefined' &&
    'audioWorklet' in window.AudioContext.prototype
  );
};

const subscribeNoiseGateWorkletAvailability = (listener: () => void) => {
  availabilitySubscribers.add(listener);

  return () => {
    availabilitySubscribers.delete(listener);
  };
};

const getNoiseGateWorkletAvailabilitySnapshot =
  (): TNoiseGateWorkletAvailability => {
    const nextSnapshot: TNoiseGateWorkletAvailability = !isNoiseGateWorkletSupported()
      ? {
          available: false,
          reason: 'This browser does not support AudioWorklet.'
        }
      : runtimeUnavailableReason
        ? {
            available: false,
            reason: runtimeUnavailableReason
          }
        : { available: true };

    if (
      availabilitySnapshotCache &&
      availabilitySnapshotCache.available === nextSnapshot.available &&
      availabilitySnapshotCache.reason === nextSnapshot.reason
    ) {
      return availabilitySnapshotCache;
    }

    availabilitySnapshotCache = nextSnapshot;

    return availabilitySnapshotCache;
  };

const markNoiseGateWorkletUnavailable = (reason: string) => {
  if (runtimeUnavailableReason) return;

  runtimeUnavailableReason = reason;
  notifyAvailabilitySubscribers();
};

const postNoiseGateWorkletConfig = (
  node: AudioWorkletNode,
  config: TNoiseGateWorkletConfig
) => {
  node.port.postMessage({
    type: 'config',
    enabled: config.enabled,
    thresholdDb: config.thresholdDb,
    holdMs: config.holdMs
  });
};

const ensureNoiseGateWorkletLoaded = async (audioContext: AudioContext) => {
  if (!isNoiseGateWorkletSupported()) {
    throw new Error('AudioWorklet is not supported in this browser.');
  }

  let loadPromise = workletLoadPromises.get(audioContext);

  if (!loadPromise) {
    loadPromise = audioContext.audioWorklet.addModule(noiseGateProcessorUrl);
    workletLoadPromises.set(audioContext, loadPromise);
  }

  await loadPromise;
};

const createNoiseGateWorkletNode = async (
  audioContext: AudioContext,
  config: TNoiseGateWorkletConfig
) => {
  await ensureNoiseGateWorkletLoaded(audioContext);

  const node = new AudioWorkletNode(audioContext, MICROPHONE_NOISE_GATE_WORKLET_NAME);

  postNoiseGateWorkletConfig(node, {
    holdMs: MICROPHONE_GATE_CLOSE_HOLD_MS,
    ...config
  });

  return node;
};

export {
  createNoiseGateWorkletNode,
  getNoiseGateWorkletAvailabilitySnapshot,
  isNoiseGateWorkletSupported,
  markNoiseGateWorkletUnavailable,
  postNoiseGateWorkletConfig,
  subscribeNoiseGateWorkletAvailability
};
