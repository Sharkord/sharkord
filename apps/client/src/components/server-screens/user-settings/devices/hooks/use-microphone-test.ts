import {
  MICROPHONE_GATE_CLOSE_HOLD_MS,
  MICROPHONE_GATE_DEFAULT_THRESHOLD_DB,
  MICROPHONE_TEST_LEVEL_SAMPLE_INTERVAL_MS,
  clampMicrophoneDecibels,
  microphoneDecibelsToPercent
} from '@/helpers/audio-gate';
import { applyAudioOutputDevice } from '@/helpers/audio-output';
import { createAudioMeterWorkletNode } from '@/helpers/audio-worklet/audio-meter-worklet';
import {
  createNoiseGateWorkletNode,
  getNoiseGateWorkletAvailabilitySnapshot,
  markNoiseGateWorkletUnavailable,
  postNoiseGateWorkletConfig
} from '@/helpers/audio-worklet/noise-gate-worklet';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type TPermissionState = 'unknown' | 'granted' | 'denied';

type TUseMicrophoneTestParams = {
  microphoneId: string | undefined;
  playbackId: string | undefined;
  autoGainControl: boolean;
  echoCancellation: boolean;
  noiseSuppression: boolean;
  noiseGateEnabled: boolean;
  noiseGateThresholdDb: number;
};

type TRequestPermissionOptions = {
  silent?: boolean;
};

const DEFAULT_DEVICE_NAME = 'default';
const LOOPBACK_DELAY_SECONDS = 0.12;
const WORKLET_METER_UPDATE_INTERVAL_MS = 16;
const ANALYZER_FFT_SIZE = 512;
const ANALYZER_SMOOTHING_TIME_CONSTANT = 0;
const ANALYZER_MIN_DECIBELS = -90;
const ANALYZER_MAX_DECIBELS = 0;
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
  noiseSuppression,
  noiseGateEnabled,
  noiseGateThresholdDb
}: TUseMicrophoneTestParams) => {
  const [permissionState, setPermissionState] =
    useState<TPermissionState>('unknown');
  const [isTesting, setIsTesting] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const testAudioRef = useRef<HTMLAudioElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const meterIntervalRef = useRef<number | null>(null);
  const meterWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const noiseGateWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const isTestRequestedRef = useRef(false);
  const testRequestIdRef = useRef(0);
  const audioLevelRef = useRef(0);
  const noiseGateEnabledRef = useRef(noiseGateEnabled);
  const noiseGateThresholdDbRef = useRef(
    clampMicrophoneDecibels(
      noiseGateThresholdDb ?? MICROPHONE_GATE_DEFAULT_THRESHOLD_DB
    )
  );

  const getAudioLevelSnapshot = useCallback(() => audioLevelRef.current, []);

  const setAudioLevelFromDecibels = useCallback((estimatedDecibels: number) => {
    const clampedDecibels = clampMicrophoneDecibels(estimatedDecibels);
    const zoomedLevel = Math.max(
      0,
      Math.min(100, microphoneDecibelsToPercent(clampedDecibels))
    );

    // Keep raw meter data in the ref; UI decides how to smooth/render it.
    audioLevelRef.current = zoomedLevel;
  }, []);

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

    if (noiseGateWorkletNodeRef.current) {
      noiseGateWorkletNodeRef.current.port.onmessage = null;
      noiseGateWorkletNodeRef.current.disconnect();
      noiseGateWorkletNodeRef.current = null;
    }

    if (meterWorkletNodeRef.current) {
      meterWorkletNodeRef.current.port.onmessage = null;
      meterWorkletNodeRef.current.disconnect();
      meterWorkletNodeRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    audioLevelRef.current = 0;
  }, [stopStreamTracks]);

  const startAnalyserMeter = useCallback(
    (analyser: AnalyserNode) => {
      const floatDataArray = new Float32Array(analyser.fftSize);

      const updateMeter = () => {
        let sum = 0;

        analyser.getFloatTimeDomainData(floatDataArray);

        for (let index = 0; index < floatDataArray.length; index++) {
          const sample = floatDataArray[index]!;

          sum += sample * sample;
        }

        const rms = Math.sqrt(sum / floatDataArray.length);
        const estimatedDecibels = 20 * Math.log10(rms + 1e-8);
        setAudioLevelFromDecibels(estimatedDecibels);
      };

      const intervalId = window.setInterval(
        updateMeter,
        MICROPHONE_TEST_LEVEL_SAMPLE_INTERVAL_MS
      );

      meterIntervalRef.current = intervalId;

      updateMeter();
    },
    [setAudioLevelFromDecibels]
  );

  const startTestPipeline = useCallback(
    async (requestId: number) => {
      cleanup();
      setError(undefined);

      let stream: MediaStream | null = null;
      let audioContext: AudioContext | null = null;
      let destination: MediaStreamAudioDestinationNode | null = null;
      let audioElement: HTMLAudioElement | null = null;
      let localMeterWorkletNode: AudioWorkletNode | null = null;
      let localNoiseGateWorkletNode: AudioWorkletNode | null = null;

      const isStaleRequest = () =>
        requestId !== testRequestIdRef.current || !isTestRequestedRef.current;

      const cleanupLocalResources = () => {
        stopStreamTracks(stream);

        if (
          audioElement &&
          destination &&
          audioElement.srcObject === destination.stream
        ) {
          audioElement.pause();
          audioElement.srcObject = null;
        }

        if (localNoiseGateWorkletNode) {
          localNoiseGateWorkletNode.port.onmessage = null;
          localNoiseGateWorkletNode.disconnect();
          localNoiseGateWorkletNode = null;
        } else if (noiseGateWorkletNodeRef.current) {
          noiseGateWorkletNodeRef.current.port.onmessage = null;
          noiseGateWorkletNodeRef.current.disconnect();
          noiseGateWorkletNodeRef.current = null;
        }

        if (localMeterWorkletNode) {
          localMeterWorkletNode.port.onmessage = null;
          localMeterWorkletNode.disconnect();
          localMeterWorkletNode = null;
        } else if (meterWorkletNodeRef.current) {
          meterWorkletNodeRef.current.port.onmessage = null;
          meterWorkletNodeRef.current.disconnect();
          meterWorkletNodeRef.current = null;
        }

        if (audioContext) {
          audioContext.close();
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
        const delay = audioContext.createDelay(1);
        let meterWorkletNode: AudioWorkletNode | null = null;
        let noiseGateWorkletNode: AudioWorkletNode | null = null;
        let analyser: AnalyserNode | null = null;

        destination = audioContext.createMediaStreamDestination();

        delay.delayTime.value = LOOPBACK_DELAY_SECONDS;

        try {
          meterWorkletNode = await createAudioMeterWorkletNode(audioContext, {
            enabled: true,
            updateIntervalMs: WORKLET_METER_UPDATE_INTERVAL_MS
          });
          localMeterWorkletNode = meterWorkletNode;
          meterWorkletNode.port.onmessage = (event) => {
            const data = event.data;

            if (!data || typeof data !== 'object' || data.type !== 'meter') {
              return;
            }

            if (
              typeof data.decibels !== 'number' ||
              !Number.isFinite(data.decibels)
            ) {
              return;
            }

            setAudioLevelFromDecibels(data.decibels);
          };
        } catch (error) {
          console.warn(
            'Audio meter AudioWorklet unavailable for mic test, using analyser fallback:',
            error
          );
        }

        const shouldUseNoiseGateWorklet =
          getNoiseGateWorkletAvailabilitySnapshot().available;

        if (shouldUseNoiseGateWorklet) {
          try {
            noiseGateWorkletNode = await createNoiseGateWorkletNode(
              audioContext,
              {
                enabled: noiseGateEnabledRef.current,
                thresholdDb: noiseGateThresholdDbRef.current,
                holdMs: MICROPHONE_GATE_CLOSE_HOLD_MS
              }
            );
            localNoiseGateWorkletNode = noiseGateWorkletNode;
          } catch (error) {
            console.warn(
              'Noise gate AudioWorklet unavailable for mic test:',
              error
            );
            markNoiseGateWorkletUnavailable(
              'Failed to initialize the noise gate audio processor.'
            );
          }
        }

        let currentAudioNode: AudioNode = source;

        if (meterWorkletNode) {
          currentAudioNode.connect(meterWorkletNode);
          currentAudioNode = meterWorkletNode;
        } else {
          analyser = audioContext.createAnalyser();
          analyser.fftSize = ANALYZER_FFT_SIZE;
          analyser.minDecibels = ANALYZER_MIN_DECIBELS;
          analyser.maxDecibels = ANALYZER_MAX_DECIBELS;
          analyser.smoothingTimeConstant = ANALYZER_SMOOTHING_TIME_CONSTANT;

          source.connect(analyser);
        }

        if (noiseGateWorkletNode) {
          currentAudioNode.connect(noiseGateWorkletNode);
          currentAudioNode = noiseGateWorkletNode;
        }

        currentAudioNode.connect(delay);
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
        meterWorkletNodeRef.current = meterWorkletNode;
        noiseGateWorkletNodeRef.current = noiseGateWorkletNode;

        setPermissionState('granted');
        if (analyser) {
          startAnalyserMeter(analyser);
        }
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
    [
      cleanup,
      getAudioConstraints,
      playbackId,
      setAudioLevelFromDecibels,
      startAnalyserMeter,
      stopStreamTracks
    ]
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
    noiseGateEnabledRef.current = noiseGateEnabled;

    if (noiseGateWorkletNodeRef.current) {
      postNoiseGateWorkletConfig(noiseGateWorkletNodeRef.current, {
        enabled: noiseGateEnabled
      });
    }
  }, [noiseGateEnabled]);

  useEffect(() => {
    const thresholdDb = clampMicrophoneDecibels(
      noiseGateThresholdDb ?? MICROPHONE_GATE_DEFAULT_THRESHOLD_DB
    );
    noiseGateThresholdDbRef.current = thresholdDb;

    if (noiseGateWorkletNodeRef.current) {
      postNoiseGateWorkletConfig(noiseGateWorkletNodeRef.current, {
        thresholdDb
      });
    }
  }, [noiseGateThresholdDb]);

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
      getAudioLevelSnapshot,
      error,
      requestPermission,
      startTest,
      stopTest
    }),
    [
      permissionState,
      isTesting,
      getAudioLevelSnapshot,
      error,
      requestPermission,
      startTest,
      stopTest
    ]
  );
};

export { useMicrophoneTest };
