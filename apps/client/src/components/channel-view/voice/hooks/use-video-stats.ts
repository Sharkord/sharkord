import { useCallback, useEffect, useRef, useState } from 'react';

type VideoStats = {
  width: number;
  height: number;
  frameRate: number;
};

const UPDATE_INTERVAL_MS = 1000;

const useVideoStats = (
  videoRef: React.RefObject<HTMLVideoElement | null>,
  enabled: boolean
) => {
  const [stats, setStats] = useState<VideoStats | null>(null);
  const frameCountRef = useRef(0);
  const lastUpdateRef = useRef(0);
  const callbackIdRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const onFrame = useCallback(() => {
    frameCountRef.current++;

    const video = videoRef.current;

    if (!video) return;

    callbackIdRef.current = video.requestVideoFrameCallback(onFrame);
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;

    if (!enabled || !video) {
      setStats(null);

      frameCountRef.current = 0;
      lastUpdateRef.current = 0;

      return;
    }

    frameCountRef.current = 0;
    lastUpdateRef.current = performance.now();
    callbackIdRef.current = video.requestVideoFrameCallback(onFrame);

    intervalRef.current = setInterval(() => {
      const now = performance.now();
      const elapsed = (now - lastUpdateRef.current) / 1000;

      if (elapsed <= 0) return;

      const fps = frameCountRef.current / elapsed;

      frameCountRef.current = 0;
      lastUpdateRef.current = now;

      const width = video.videoWidth || 0;
      const height = video.videoHeight || 0;

      if (width > 0 && height > 0) {
        setStats({ width, height, frameRate: Math.round(fps) });
      } else {
        setStats(null);
      }
    }, UPDATE_INTERVAL_MS);

    return () => {
      if (callbackIdRef.current !== null && video) {
        video.cancelVideoFrameCallback(callbackIdRef.current);

        callbackIdRef.current = null;
      }

      if (intervalRef.current) {
        clearInterval(intervalRef.current);

        intervalRef.current = null;
      }

      setStats(null);

      frameCountRef.current = 0;
      lastUpdateRef.current = 0;
    };
  }, [enabled, videoRef, onFrame]);

  return stats;
};

export { useVideoStats };
