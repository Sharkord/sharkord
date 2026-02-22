import { useCallback, useEffect, useState } from 'react';

const useAvailableDevices = () => {
  const [inputDevices, setInputDevices] = useState<
    (MediaDeviceInfo | undefined)[]
  >([]);
  const [playbackDevices, setPlaybackDevices] = useState<
    (MediaDeviceInfo | undefined)[]
  >([]);
  const [videoDevices, setVideoDevices] = useState<
    (MediaDeviceInfo | undefined)[]
  >([]);
  const [loading, setLoading] = useState(true);

  const normalizeDevices = useCallback(
    (devices: MediaDeviceInfo[], kind: MediaDeviceKind) => {
      const seen = new Set<string>();
      const normalized: MediaDeviceInfo[] = [];

      for (const device of devices) {
        const dedupeKey =
          device.deviceId || `${kind}-fallback-${device.groupId || 'default'}`;

        if (seen.has(dedupeKey)) {
          continue;
        }

        seen.add(dedupeKey);
        normalized.push(device);
      }

      return normalized;
    },
    []
  );

  const loadDevices = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setLoading(false);
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();

      const inputDevices = normalizeDevices(
        devices.filter((device) => device.kind === 'audioinput'),
        'audioinput'
      );

      const playbackDevices = normalizeDevices(
        devices.filter((device) => device.kind === 'audiooutput'),
        'audiooutput'
      );

      const videoDevices = normalizeDevices(
        devices.filter((device) => device.kind === 'videoinput'),
        'videoinput'
      );

      setInputDevices(inputDevices);
      setPlaybackDevices(playbackDevices);
      setVideoDevices(videoDevices);
    } finally {
      setLoading(false);
    }
  }, [normalizeDevices]);

  useEffect(() => {
    void loadDevices();

    if (!navigator.mediaDevices?.addEventListener) return;

    const onDeviceChange = () => {
      void loadDevices();
    };

    navigator.mediaDevices.addEventListener('devicechange', onDeviceChange);

    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', onDeviceChange);
    };
  }, [loadDevices]);

  return { inputDevices, playbackDevices, videoDevices, loading, loadDevices };
};

export { useAvailableDevices };
