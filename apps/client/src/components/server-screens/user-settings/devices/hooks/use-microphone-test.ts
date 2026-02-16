import { applyAudioOutputDevice } from '@/helpers/audio-output';
import { useCallback, useEffect, useRef, useState } from 'react';

type TPermissionState = 'unknown' | 'granted' | 'denied';

type TUseMicrophoneTestParams = {
  microphoneId: string | undefined;
  playbackId: string | undefined;
  autoGainControl: boolean;
  echoCancellation: boolean;
  noiseSuppression: boolean;
};

type TRequestPermissionOptions = {
  silent?: boolean;
};

const DEFAULT_DEVICE_NAME = 'default';
const LOOPBACK_DELAY_SECONDS = 0.12;
const ANALYZER_FFT_SIZE = 512;
const ANALYZER_SMOOTHING_TIME_CONSTANT = 0.85;
const ANALYZER_MIN_DECIBELS = -90;
const ANALYZER_MAX_DECIBELS = -10;
const METER_ZOOM_MIN_DECIBELS = -70;
const METER_ZOOM_MAX_DECIBELS = -20;

const isPermissionDeniedError = (error: unknown) =>
  error instanceof DOMException &&
  (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError');

const getMicrophoneErrorMessage = (error: unknown) => {
  if (!(error instanceof DOMException)) {
    return 'Failed to access microphone.';
  }

  switch (error.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Microphone permission was denied.';
    case 'NotFoundError':
      return 'No microphone was found.';
    case 'NotReadableError':
      return 'Microphone is already in use by another application.';
    case 'OverconstrainedError':
      return 'Selected microphone is unavailable.';
    default:
      return 'Failed to access microphone.';
  }
};

const useMicrophoneTest = ({
  microphoneId,
  playbackId,
  autoGainControl,
  echoCancellation,
  noiseSuppression
}: TUseMicrophoneTestParams) => {
  const [permissionState, setPermissionState] =
    useState<TPermissionState>('unknown');
  const [isTesting, setIsTesting] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | undefined>(undefined);
  const testAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const permissionStreamRef = useRef<MediaStream | null>(null);
  const permissionStreamTimeoutRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isTestRequestedRef = useRef(false);

  const getAudioConstraints = useCallback((): MediaTrackConstraints => {
    const hasSpecificDevice =
      microphoneId && microphoneId !== DEFAULT_DEVICE_NAME;

    return {
      deviceId: hasSpecificDevice ? { exact: microphoneId } : undefined,
      autoGainControl,
      echoCancellation,
      noiseSuppression,
      sampleRate: 48000,
      channelCount: 2
    };
  }, [microphoneId, autoGainControl, echoCancellation, noiseSuppression]);

  const stopStreamTracks = useCallback((stream: MediaStream | null) => {
    stream?.getTracks().forEach((track) => track.stop());
  }, []);

  const clearPermissionStream = useCallback(() => {
    if (permissionStreamTimeoutRef.current) {
      window.clearTimeout(permissionStreamTimeoutRef.current);
      permissionStreamTimeoutRef.current = null;
    }

    stopStreamTracks(permissionStreamRef.current);
    permissionStreamRef.current = null;
  }, [stopStreamTracks]);

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    clearPermissionStream();

    stopStreamTracks(mediaStreamRef.current);
    mediaStreamRef.current = null;

    if (testAudioRef.current) {
      testAudioRef.current.pause();
      testAudioRef.current.srcObject = null;
    }

    if (audioContextRef.current) {
      void audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setAudioLevel(0);
  }, [clearPermissionStream, stopStreamTracks]);

  const startMeter = useCallback((analyser: AnalyserNode) => {
    const floatDataArray = new Float32Array(analyser.fftSize);

    const updateMeter = () => {
      let sum = 0;

      // Float samples avoid 8-bit quantization floor that can keep the meter
      // visibly active even when the mic hardware is muted.
      analyser.getFloatTimeDomainData(floatDataArray);

      for (let index = 0; index < floatDataArray.length; index++) {
        const sample = floatDataArray[index]!;
        sum += sample * sample;
      }

      const rms = Math.sqrt(sum / floatDataArray.length);
      const estimatedDecibels = 20 * Math.log10(rms + 1e-8);
      const level =
        ((estimatedDecibels - METER_ZOOM_MIN_DECIBELS) /
          (METER_ZOOM_MAX_DECIBELS - METER_ZOOM_MIN_DECIBELS)) *
        100;
      const zoomedLevel = Math.max(0, Math.min(100, level));

      setAudioLevel(zoomedLevel);
      animationFrameRef.current = requestAnimationFrame(updateMeter);
    };

    updateMeter();
  }, []);

  const startTestPipeline = useCallback(async () => {
    cleanup();
    clearPermissionStream();
    setError(undefined);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: getAudioConstraints(),
        video: false
      });

      mediaStreamRef.current = stream;
      setPermissionState('granted');

      const AudioContextClass =
        window.AudioContext ||
        (window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }).webkitAudioContext;

      if (!AudioContextClass) {
        throw new Error('AudioContext is not supported in this browser.');
      }

      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      const delay = audioContext.createDelay(1);
      const destination = audioContext.createMediaStreamDestination();

      analyser.fftSize = ANALYZER_FFT_SIZE;
      analyser.minDecibels = ANALYZER_MIN_DECIBELS;
      analyser.maxDecibels = ANALYZER_MAX_DECIBELS;
      analyser.smoothingTimeConstant = ANALYZER_SMOOTHING_TIME_CONSTANT;

      delay.delayTime.value = LOOPBACK_DELAY_SECONDS;

      source.connect(analyser);
      source.connect(delay);
      delay.connect(destination);

      startMeter(analyser);

      if (testAudioRef.current) {
        testAudioRef.current.srcObject = destination.stream;
        await applyAudioOutputDevice(testAudioRef.current, playbackId);
        await testAudioRef.current.play();
      }

      setIsTesting(true);
      return true;
    } catch (error) {
      cleanup();
      setIsTesting(false);
      isTestRequestedRef.current = false;

      if (isPermissionDeniedError(error)) {
        setPermissionState('denied');
      }

      setError(getMicrophoneErrorMessage(error));
      return false;
    }
  }, [cleanup, clearPermissionStream, getAudioConstraints, playbackId, startMeter]);

  const requestPermission = useCallback(
    async ({ silent = false }: TRequestPermissionOptions = {}) => {
      if (!silent) {
        setError(undefined);
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: getAudioConstraints(),
          video: false
        });

        clearPermissionStream();
        permissionStreamRef.current = stream;
        setPermissionState('granted');

        // Keep a short-lived stream so enumerateDevices can resolve full labels
        // consistently across browsers, then release the mic.
        permissionStreamTimeoutRef.current = window.setTimeout(() => {
          clearPermissionStream();
        }, 1500);
      } catch (error) {
        if (isPermissionDeniedError(error)) {
          setPermissionState('denied');
        }

        if (!silent) {
          setError(getMicrophoneErrorMessage(error));
        }
      }
    },
    [clearPermissionStream, getAudioConstraints]
  );

  const startTest = useCallback(async () => {
    isTestRequestedRef.current = true;
    return startTestPipeline();
  }, [startTestPipeline]);

  const stopTest = useCallback(() => {
    isTestRequestedRef.current = false;
    setIsTesting(false);
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    if (!navigator.permissions?.query) return;

    let mounted = true;
    let permissionStatus: PermissionStatus | null = null;

    const updatePermissionState = () => {
      if (!permissionStatus || !mounted) return;

      if (permissionStatus.state === 'granted') {
        setPermissionState('granted');
        return;
      }

      if (permissionStatus.state === 'denied') {
        setPermissionState('denied');
        return;
      }

      setPermissionState('unknown');
    };

    void navigator.permissions
      .query({ name: 'microphone' as PermissionName })
      .then((status) => {
        permissionStatus = status;
        updatePermissionState();
        permissionStatus.onchange = updatePermissionState;
      })
      .catch(() => {
        // ignore browsers that do not support this permission descriptor
      });

    return () => {
      mounted = false;

      if (permissionStatus) {
        permissionStatus.onchange = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!isTestRequestedRef.current) return;

    void startTestPipeline();
  }, [startTestPipeline]);

  useEffect(() => {
    return () => {
      isTestRequestedRef.current = false;
      cleanup();
    };
  }, [cleanup]);

  return {
    testAudioRef,
    permissionState,
    isTesting,
    audioLevel,
    error,
    requestPermission,
    startTest,
    stopTest
  };
};

export { useMicrophoneTest };
