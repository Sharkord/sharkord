import { MICROPHONE_GATE_DEFAULT_THRESHOLD_DB } from '@/helpers/audio-gate';
import {
  getLocalStorageItemAsJSON,
  LocalStorageKey,
  setLocalStorageItemAsJSON
} from '@/helpers/storage';
import {
  NoiseSuppression,
  Resolution,
  VideoCodec,
  type TDeviceSettings
} from '@/types';
import { DEFAULT_BITRATE } from '@sharkord/shared';
import {
  createContext,
  memo,
  useCallback,
  useEffect,
  useMemo,
  useState
} from 'react';
import { useAvailableDevices } from './hooks/use-available-devices';

const DEFAULT_DEVICE_SETTINGS: TDeviceSettings = {
  microphoneId: undefined,
  playbackId: undefined,
  webcamId: undefined,
  webcamResolution: Resolution['720p'],
  webcamFramerate: 30,
  echoCancellation: false,
  noiseSuppression: NoiseSuppression.NONE,
  autoGainControl: true,
  noiseGateEnabled: false,
  noiseGateThresholdDb: MICROPHONE_GATE_DEFAULT_THRESHOLD_DB,
  shareSystemAudio: true,
  mirrorOwnVideo: false,
  screenResolution: Resolution['720p'],
  screenFramerate: 30,
  screenCodec: VideoCodec.AUTO,
  screenBitrate: DEFAULT_BITRATE
};

export type TDevicesProvider = {
  loading: boolean;
  devices: TDeviceSettings;
  saveDevices: (newDevices: TDeviceSettings) => void;
};

const DevicesProviderContext = createContext<TDevicesProvider>({
  loading: false,
  devices: DEFAULT_DEVICE_SETTINGS,
  saveDevices: () => {}
});

type TDevicesProviderProps = {
  children: React.ReactNode;
};

const DevicesProvider = memo(({ children }: TDevicesProviderProps) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [devices, setDevices] = useState<TDeviceSettings>(
    DEFAULT_DEVICE_SETTINGS
  );
  const { loading: devicesLoading } = useAvailableDevices();

  const saveDevices = useCallback((newDevices: TDeviceSettings) => {
    setDevices(newDevices);
    setLocalStorageItemAsJSON<TDeviceSettings>(
      LocalStorageKey.DEVICES_SETTINGS,
      newDevices
    );
  }, []);

  useEffect(() => {
    if (devicesLoading) return;

    const savedSettings = getLocalStorageItemAsJSON<TDeviceSettings>(
      LocalStorageKey.DEVICES_SETTINGS
    );

    if (savedSettings) {
      // migrate stale boolean noiseSuppression values from before the enum was
      // introduced as true => STANDARD, false/anything else => NONE
      const noiseSuppressionValues = Object.values(
        NoiseSuppression
      ) as string[];
      const rawNs = savedSettings.noiseSuppression as unknown;
      const noiseSuppression: NoiseSuppression =
        noiseSuppressionValues.includes(rawNs as string)
          ? (rawNs as NoiseSuppression)
          : rawNs === true
            ? NoiseSuppression.STANDARD
            : NoiseSuppression.NONE;

      setDevices({
        ...DEFAULT_DEVICE_SETTINGS,
        ...savedSettings,
        noiseSuppression
      });
    }

    setLoading(false);
  }, [devicesLoading]);

  const contextValue = useMemo<TDevicesProvider>(
    () => ({
      loading,
      devices,
      saveDevices
    }),
    [loading, devices, saveDevices]
  );

  return (
    <DevicesProviderContext.Provider value={contextValue}>
      {children}
    </DevicesProviderContext.Provider>
  );
});

export { DevicesProvider, DevicesProviderContext };
