import {
  getLocalStorageItemAsJSON,
  LocalStorageKey,
  setLocalStorageItemAsJSON
} from '@/helpers/storage';
import { Resolution, type TDeviceSettings } from '@/types';
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
  webcamId: undefined,
  webcamResolution: Resolution['720p'],
  webcamFramerate: 30,
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: true,
  shareSystemAudio: true,
  mirrorOwnVideo: false,
  screenResolution: Resolution['720p'],
  screenFramerate: 30
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
      setDevices(savedSettings);
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
