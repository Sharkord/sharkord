import { useOwnVoiceUser } from '@/features/server/hooks';
import { useEffect, useRef, useState } from 'react';

// speaking intensity level (0 = silent, 1 = quiet, 2 = normal, 3 = loud)
// this might need to be optimized

enum SpeakingIntensity {
  Silent = 0,
  Quiet = 1,
  Normal = 2,
  Loud = 3
}

const ANALYZER_FFT_SIZE = 512;
const ANALYZER_MIN_DECIBELS = -90;
const ANALYZER_MAX_DECIBELS = -10;
const ANALYZER_SMOOTHING_TIME_CONSTANT = 0.85;
const SPEAKING_THRESHOLD = 8;
const LEVEL_POLL_INTERVAL_MS = 50;

const SPEAKING_EFFECT_CLASSES: Record<SpeakingIntensity, string> = {
  [SpeakingIntensity.Silent]: '',
  [SpeakingIntensity.Quiet]: 'speaking-effect-low',
  [SpeakingIntensity.Normal]: 'speaking-effect-medium',
  [SpeakingIntensity.Loud]: 'speaking-effect-high'
};

const useAudioLevel = (
  audioStream: MediaStream | MediaStream[] | undefined
) => {
  const [audioLevel, setAudioLevel] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const ownVoiceUser = useOwnVoiceUser();

  useEffect(() => {
    const streams = Array.isArray(audioStream)
      ? audioStream
      : audioStream
        ? [audioStream]
        : [];

    if (streams.length === 0 || ownVoiceUser?.state.soundMuted) {
      setAudioLevel(0);
      setIsSpeaking(false);
      return;
    }

    const sources: MediaStreamAudioSourceNode[] = [];

    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;

      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();

      analyser.fftSize = ANALYZER_FFT_SIZE;
      analyser.minDecibels = ANALYZER_MIN_DECIBELS;
      analyser.maxDecibels = ANALYZER_MAX_DECIBELS;
      analyser.smoothingTimeConstant = ANALYZER_SMOOTHING_TIME_CONSTANT;

      for (const stream of streams) {
        if (stream.getAudioTracks().length === 0) {
          continue;
        }

        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        sources.push(source);
      }

      if (sources.length === 0) {
        audioContext.close().catch(() => {});
        setAudioLevel(0);
        setIsSpeaking(false);
        return;
      }

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const checkAudioLevel = () => {
        if (!analyserRef.current) return;

        analyserRef.current.getByteFrequencyData(dataArray);

        // calculate rms (root mean square) of the frequency data
        let sum = 0;

        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i] * dataArray[i];
        }

        const rms = Math.sqrt(sum / dataArray.length);
        const normalizedLevel = Math.min(100, (rms / 255) * 100);

        setAudioLevel(normalizedLevel);
        setIsSpeaking(normalizedLevel > SPEAKING_THRESHOLD);
      };

      checkAudioLevel();
      intervalRef.current = setInterval(
        checkAudioLevel,
        LEVEL_POLL_INTERVAL_MS
      );
    } catch (error) {
      console.warn('Audio level detection not supported:', error);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      for (const source of sources) {
        source.disconnect();
      }

      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }

      analyserRef.current = null;
      setAudioLevel(0);
      setIsSpeaking(false);
    };
  }, [audioStream, ownVoiceUser?.state.soundMuted]);

  const speakingIntensity = isSpeaking
    ? audioLevel < 15
      ? SpeakingIntensity.Quiet
      : audioLevel < 30
        ? SpeakingIntensity.Normal
        : SpeakingIntensity.Loud
    : SpeakingIntensity.Silent;

  const speakingEffectClass = SPEAKING_EFFECT_CLASSES[speakingIntensity] ?? '';

  return {
    audioLevel,
    isSpeaking,
    speakingIntensity,
    speakingEffectClass
  };
};

export { useAudioLevel };
