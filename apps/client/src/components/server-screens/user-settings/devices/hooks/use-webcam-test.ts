import { getResWidthHeight } from '@/helpers/get-res-with-height';
import { Resolution } from '@/types';
import { useCallback, useEffect, useRef, useState } from 'react';

type TUseWebcamTestParams = {
  webcamId: string | undefined;
  webcamResolution: Resolution;
  webcamFramerate: number;
};

const DEFAULT_DEVICE_NAME = 'default';

const getWebcamErrorMessage = (error: unknown) => {
  if (!(error instanceof DOMException)) {
    return 'Failed to access webcam.';
  }

  switch (error.name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
      return 'Webcam permission was denied.';
    case 'NotFoundError':
      return 'No webcam was found.';
    case 'NotReadableError':
      return 'Webcam is already in use by another application.';
    case 'OverconstrainedError':
      return 'Selected webcam is unavailable.';
    default:
      return 'Failed to access webcam.';
  }
};

const useWebcamTest = ({
  webcamId,
  webcamResolution,
  webcamFramerate
}: TUseWebcamTestParams) => {
  const [isStarting, setIsStarting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isPreviewReady, setIsPreviewReady] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [videoStream, setVideoStream] = useState<MediaStream | undefined>(
    undefined
  );
  const testVideoRef = useRef<HTMLVideoElement | null>(null);
  const videoStreamRef = useRef<MediaStream | undefined>(undefined);
  const startRequestIdRef = useRef(0);
  const settingsSignatureRef = useRef<string>(
    `${webcamId ?? DEFAULT_DEVICE_NAME}|${webcamResolution}|${webcamFramerate}`
  );

  const stopVideoTracks = useCallback((stream: MediaStream | undefined) => {
    stream?.getTracks().forEach((track) => track.stop());
  }, []);

  const cleanup = useCallback(() => {
    stopVideoTracks(videoStreamRef.current);
    videoStreamRef.current = undefined;

    if (testVideoRef.current) {
      testVideoRef.current.pause();
      testVideoRef.current.srcObject = null;
    }

    setVideoStream(undefined);
    setIsPreviewReady(false);
    setIsStarting(false);
    setIsTesting(false);
  }, [stopVideoTracks]);

  const getVideoConstraints = useCallback((): MediaTrackConstraints => {
    const hasSpecificDevice = webcamId && webcamId !== DEFAULT_DEVICE_NAME;

    return {
      deviceId: hasSpecificDevice ? { exact: webcamId } : undefined,
      frameRate: webcamFramerate,
      ...getResWidthHeight(webcamResolution)
    };
  }, [webcamId, webcamFramerate, webcamResolution]);

  const attachStreamToPreview = useCallback(
    async (stream: MediaStream | undefined) => {
      if (!stream || !testVideoRef.current) return false;

      const videoElement = testVideoRef.current;
      videoElement.srcObject = stream;

      if (videoElement.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        await new Promise<void>((resolve) => {
          let isDone = false;
          const onReady = () => {
            if (isDone) return;
            isDone = true;
            videoElement.removeEventListener('loadedmetadata', onReady);
            videoElement.removeEventListener('canplay', onReady);
            window.clearTimeout(timeoutId);
            resolve();
          };

          videoElement.addEventListener('loadedmetadata', onReady);
          videoElement.addEventListener('canplay', onReady);

          const timeoutId = window.setTimeout(onReady, 600);
        });
      }

      try {
        await videoElement.play();
        setIsPreviewReady(true);
        setIsStarting(false);
        return true;
      } catch {
        // Ignore transient autoplay race conditions and retry from the effect.
        return false;
      }
    },
    []
  );

  const startTest = useCallback(async () => {
    const requestId = startRequestIdRef.current + 1;
    startRequestIdRef.current = requestId;

    cleanup();
    setError(undefined);
    setIsStarting(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: getVideoConstraints(),
        audio: false
      });

      if (requestId !== startRequestIdRef.current) {
        stopVideoTracks(stream);
        return false;
      }

      videoStreamRef.current = stream;
      setVideoStream(stream);
      setIsPreviewReady(false);
      setIsTesting(true);

      return true;
    } catch (error) {
      if (requestId !== startRequestIdRef.current) {
        return false;
      }

      cleanup();
      setIsStarting(false);
      setError(getWebcamErrorMessage(error));

      return false;
    }
  }, [cleanup, getVideoConstraints, stopVideoTracks]);

  const stopTest = useCallback(() => {
    startRequestIdRef.current += 1;
    cleanup();
  }, [cleanup]);

  useEffect(() => {
    if (!videoStream || !isTesting) return;

    let attemptCount = 0;
    const maxAttempts = 20;
    let isCancelled = false;

    const tryAttach = async () => {
      attemptCount += 1;

      const attached = await attachStreamToPreview(videoStream);
      if (isCancelled) return;

      if (attached) return;

      if (attemptCount >= maxAttempts) {
        setIsStarting(false);
        setError(
          'Failed to start webcam preview. Please retry or choose another webcam.'
        );
        return;
      }

      window.setTimeout(() => {
        if (isCancelled) return;
        void tryAttach();
      }, 120);
    };

    void tryAttach();

    return () => {
      isCancelled = true;
    };
  }, [videoStream, isTesting, attachStreamToPreview]);

  useEffect(() => {
    const settingsSignature = `${webcamId ?? DEFAULT_DEVICE_NAME}|${webcamResolution}|${webcamFramerate}`;
    const previousSignature = settingsSignatureRef.current;
    settingsSignatureRef.current = settingsSignature;

    if (previousSignature === settingsSignature) return;
    if (!isTesting) return;

    void startTest();
  }, [webcamId, webcamResolution, webcamFramerate, isTesting, startTest]);

  useEffect(() => {
    return () => {
      startRequestIdRef.current += 1;
      cleanup();
    };
  }, [cleanup]);

  return {
    testVideoRef,
    isStarting,
    isTesting,
    isPreviewReady,
    error,
    startTest,
    stopTest
  };
};

export { useWebcamTest };
