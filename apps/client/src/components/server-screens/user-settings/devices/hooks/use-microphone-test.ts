import { applyAudioOutputDevice } from '@/helpers/audio-output';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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
const ANALYZER_MAX_DECIBELS = 0;
const METER_MIN_DECIBELS = -60;
const METER_MAX_DECIBELS = 0;
const METER_UPDATE_INTERVAL_MS = 20; // target 20 fps, no need for more

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
  const audioContextRef = useRef<AudioContext | null>(null);
  const meterIntervalRef = useRef<number | null>(null);
  const isTestRequestedRef = useRef(false);
  const testRequestIdRef = useRef(0);

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

  const cleanup = useCallback(() => {
    if (meterIntervalRef.current) {
      window.clearInterval(meterIntervalRef.current);

      meterIntervalRef.current = null;
    }

    stopStreamTracks(mediaStreamRef.current);
    mediaStreamRef.current = null;

    if (testAudioRef.current) {
      testAudioRef.current.pause();
      testAudioRef.current.srcObject = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setAudioLevel(0);
  }, [stopStreamTracks]);

  const startMeter = useCallback((analyser: AnalyserNode) => {
    const floatDataArray = new Float32Array(analyser.fftSize);
    let lastRoundedLevel = -1;

    const updateMeter = () => {
      let sum = 0;

      analyser.getFloatTimeDomainData(floatDataArray);

      for (let index = 0; index < floatDataArray.length; index++) {
        const sample = floatDataArray[index]!;

        sum += sample * sample;
      }

      const rms = Math.sqrt(sum / floatDataArray.length);
      const estimatedDecibels = 20 * Math.log10(rms + 1e-8);

      const clampedDecibels = Math.max(
        METER_MIN_DECIBELS,
        Math.min(METER_MAX_DECIBELS, estimatedDecibels)
      );

      const level =
        ((clampedDecibels - METER_MIN_DECIBELS) /
          (METER_MAX_DECIBELS - METER_MIN_DECIBELS)) *
        100;

      const zoomedLevel = Math.max(0, Math.min(100, level));

      const rounded = Math.round(zoomedLevel);

      if (rounded !== lastRoundedLevel) {
        lastRoundedLevel = rounded;
        setAudioLevel(zoomedLevel);
      }
    };

    const intervalId = window.setInterval(
      updateMeter,
      METER_UPDATE_INTERVAL_MS
    );

    meterIntervalRef.current = intervalId;

    updateMeter();
  }, []);

  const startTestPipeline = useCallback(
    async (requestId: number) => {
      cleanup();
      setError(undefined);

      let stream: MediaStream | null = null;
      let audioContext: AudioContext | null = null;
      let destination: MediaStreamAudioDestinationNode | null = null;
      let audioElement: HTMLAudioElement | null = null;

      const isStaleRequest = () =>
        requestId !== testRequestIdRef.current || !isTestRequestedRef.current;

      const cleanupLocalResources = () => {
        stopStreamTracks(stream);

        if (audioContext) {
          audioContext.close();
        }

        if (
          audioElement &&
          destination &&
          audioElement.srcObject === destination.stream
        ) {
          audioElement.pause();
          audioElement.srcObject = null;
        }
      };

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: getAudioConstraints(),
          video: false
        });

        if (isStaleRequest()) {
          cleanupLocalResources();

          return false;
        }

        audioContext = new window.AudioContext();

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        const delay = audioContext.createDelay(1);

        destination = audioContext.createMediaStreamDestination();

        analyser.fftSize = ANALYZER_FFT_SIZE;
        analyser.minDecibels = ANALYZER_MIN_DECIBELS;
        analyser.maxDecibels = ANALYZER_MAX_DECIBELS;
        analyser.smoothingTimeConstant = ANALYZER_SMOOTHING_TIME_CONSTANT;

        delay.delayTime.value = LOOPBACK_DELAY_SECONDS;

        source.connect(analyser);
        source.connect(delay);
        delay.connect(destination);

        if (testAudioRef.current) {
          audioElement = testAudioRef.current;
          audioElement.srcObject = destination.stream;

          await applyAudioOutputDevice(audioElement, playbackId);

          if (isStaleRequest()) {
            cleanupLocalResources();

            return false;
          }

          await audioElement.play();
        }

        if (isStaleRequest()) {
          cleanupLocalResources();

          return false;
        }

        mediaStreamRef.current = stream;
        audioContextRef.current = audioContext;

        setPermissionState('granted');
        startMeter(analyser);
        setIsTesting(true);

        return true;
      } catch (error) {
        if (isStaleRequest()) {
          cleanupLocalResources();

          return false;
        }

        cleanupLocalResources();
        cleanup();
        setIsTesting(false);

        isTestRequestedRef.current = false;

        if (isPermissionDeniedError(error)) {
          setPermissionState('denied');
        }

        setError(getMicrophoneErrorMessage(error));

        return false;
      }
    },
    [cleanup, getAudioConstraints, playbackId, startMeter, stopStreamTracks]
  );

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

        stopStreamTracks(stream);
        setPermissionState('granted');
      } catch (error) {
        if (isPermissionDeniedError(error)) {
          setPermissionState('denied');
        }

        if (!silent) {
          setError(getMicrophoneErrorMessage(error));
        }
      }
    },
    [getAudioConstraints, stopStreamTracks]
  );

  const startTest = useCallback(async () => {
    isTestRequestedRef.current = true;
    testRequestIdRef.current += 1;

    return startTestPipeline(testRequestIdRef.current);
  }, [startTestPipeline]);

  const stopTest = useCallback(() => {
    isTestRequestedRef.current = false;
    testRequestIdRef.current += 1;

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

    navigator.permissions
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

    testRequestIdRef.current += 1;
    startTestPipeline(testRequestIdRef.current);
  }, [startTestPipeline]);

  useEffect(() => {
    return () => {
      isTestRequestedRef.current = false;
      testRequestIdRef.current += 1;
      cleanup();
    };
  }, [cleanup]);

  return useMemo(
    () => ({
      testAudioRef,
      permissionState,
      isTesting,
      audioLevel,
      error,
      requestPermission,
      startTest,
      stopTest
    }),
    [
      permissionState,
      isTesting,
      audioLevel,
      error,
      requestPermission,
      startTest,
      stopTest
    ]
  );
};

export { useMicrophoneTest };
