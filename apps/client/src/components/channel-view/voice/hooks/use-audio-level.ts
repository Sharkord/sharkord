import { useOwnVoiceUser } from '@/features/server/hooks';
import { useEffect, useState } from 'react';

enum SpeakingIntensity {
  Silent = 0,
  Quiet = 1,
  Normal = 2,
  Loud = 3
}

type TIntensityListener = (intensity: SpeakingIntensity) => void;

type TStreamMonitor = {
  source: MediaStreamAudioSourceNode;
  analyser: AnalyserNode;
  data: Uint8Array<ArrayBuffer>;
  intensity: SpeakingIntensity;
  listeners: Set<TIntensityListener>;
};

const ANALYZER_FFT_SIZE = 512;
const ANALYZER_MIN_DECIBELS = -90;
const ANALYZER_MAX_DECIBELS = -10;
const ANALYZER_SMOOTHING_TIME_CONSTANT = 0.85;
const SPEAKING_THRESHOLD = 8;

const SPEAKING_EFFECT_CLASSES: Record<SpeakingIntensity, string> = {
  [SpeakingIntensity.Silent]: '',
  [SpeakingIntensity.Quiet]: 'speaking-effect-low',
  [SpeakingIntensity.Normal]: 'speaking-effect-medium',
  [SpeakingIntensity.Loud]: 'speaking-effect-high'
};

const monitors = new Map<MediaStream, TStreamMonitor>();

let audioContext: AudioContext | null = null;
let frameId: number | null = null;

const getSpeakingIntensity = (level: number) => {
  if (level <= SPEAKING_THRESHOLD) return SpeakingIntensity.Silent;
  if (level < 15) return SpeakingIntensity.Quiet;
  if (level < 30) return SpeakingIntensity.Normal;

  return SpeakingIntensity.Loud;
};

const pollMonitors = () => {
  frameId = requestAnimationFrame(pollMonitors);

  monitors.forEach((monitor) => {
    monitor.analyser.getByteFrequencyData(monitor.data);

    let sum = 0;

    for (let i = 0; i < monitor.data.length; i++) {
      sum += monitor.data[i] * monitor.data[i];
    }

    const rms = Math.sqrt(sum / monitor.data.length);
    const level = Math.min(100, (rms / 255) * 100);
    const intensity = getSpeakingIntensity(level);

    if (intensity === monitor.intensity) return;

    monitor.intensity = intensity;
    monitor.listeners.forEach((listener) => listener(intensity));
  });
};

const createMonitor = (context: AudioContext, stream: MediaStream) => {
  const analyser = context.createAnalyser();
  const source = context.createMediaStreamSource(stream);

  analyser.fftSize = ANALYZER_FFT_SIZE;
  analyser.minDecibels = ANALYZER_MIN_DECIBELS;
  analyser.maxDecibels = ANALYZER_MAX_DECIBELS;
  analyser.smoothingTimeConstant = ANALYZER_SMOOTHING_TIME_CONSTANT;

  source.connect(analyser);

  return {
    source,
    analyser,
    data: new Uint8Array(analyser.frequencyBinCount),
    intensity: SpeakingIntensity.Silent,
    listeners: new Set<TIntensityListener>()
  };
};

const subscribeToSpeakingIntensity = (
  stream: MediaStream,
  listener: TIntensityListener
) => {
  if (!audioContext) {
    audioContext = new AudioContext();
  }

  let monitor = monitors.get(stream);

  if (!monitor) {
    monitor = createMonitor(audioContext, stream);
    monitors.set(stream, monitor);
  }

  monitor.listeners.add(listener);
  listener(monitor.intensity);

  if (frameId === null) {
    frameId = requestAnimationFrame(pollMonitors);
  }

  const subscribedMonitor = monitor;

  return () => {
    subscribedMonitor.listeners.delete(listener);

    if (subscribedMonitor.listeners.size > 0) return;

    subscribedMonitor.source.disconnect();
    monitors.delete(stream);

    if (monitors.size > 0) return;

    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }

    audioContext?.close();
    audioContext = null;
  };
};

const useAudioLevel = (audioStream: MediaStream | undefined) => {
  const [speakingIntensity, setSpeakingIntensity] = useState(
    SpeakingIntensity.Silent
  );
  const ownVoiceUser = useOwnVoiceUser();
  const soundMuted = ownVoiceUser?.state.soundMuted;

  useEffect(() => {
    if (!audioStream || soundMuted) {
      setSpeakingIntensity(SpeakingIntensity.Silent);
      return;
    }

    try {
      const unsubscribe = subscribeToSpeakingIntensity(
        audioStream,
        setSpeakingIntensity
      );

      return () => {
        unsubscribe();
        setSpeakingIntensity(SpeakingIntensity.Silent);
      };
    } catch (error) {
      console.warn('Audio level detection not supported:', error);
    }
  }, [audioStream, soundMuted]);

  return {
    isSpeaking: speakingIntensity !== SpeakingIntensity.Silent,
    speakingEffectClass: SPEAKING_EFFECT_CLASSES[speakingIntensity]
  };
};

export { useAudioLevel };
