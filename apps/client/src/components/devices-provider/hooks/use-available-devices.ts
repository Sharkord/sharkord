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

  const loadDevices = useCallback(async () => {
    const devices = await navigator.mediaDevices.enumerateDevices();

    const inputDevices = devices.filter(
      (device) => device.kind === 'audioinput'
    );

    const playbackDevices = devices.filter(
      (device) => device.kind === 'audiooutput'
    );

    const videoDevices = devices.filter(
      (device) => device.kind === 'videoinput'
    );

    setInputDevices(inputDevices);
    setPlaybackDevices(playbackDevices);
    setVideoDevices(videoDevices);

    setLoading(false);
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  return { inputDevices, playbackDevices, videoDevices, loading };
};

export { useAvailableDevices };
