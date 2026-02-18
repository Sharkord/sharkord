import {
  getLocalStorageItemAsJSON,
  LocalStorageKey,
  setLocalStorageItemAsJSON
} from '@/helpers/storage';
import {
  createContext,
  memo,
  useCallback,
  useContext,
  useRef,
  useState
} from 'react';

// volume keys are string-based for persistence
// user volumes: "user-{userId}"
// external stream volumes: "external-{pluginId}-{key}"
type TVolumeKey = string;

type TVolumeSettings = Record<TVolumeKey, number>;

type TVolumeControlContext = {
  volumes: TVolumeSettings;
  getVolume: (key: TVolumeKey) => number;
  setVolume: (key: TVolumeKey, volume: number) => void;
  toggleMute: (key: TVolumeKey) => void;
  getUserVolumeKey: (userId: number) => TVolumeKey;
  getUserScreenVolumeKey: (userId: number) => TVolumeKey;
  getExternalVolumeKey: (pluginId: string, key: string) => TVolumeKey;
};

const VolumeControlContext = createContext<TVolumeControlContext | null>(null);

type TVolumeControlProviderProps = {
  children: React.ReactNode;
};

const loadVolumesFromStorage = (): TVolumeSettings => {
  try {
    return (
      getLocalStorageItemAsJSON<TVolumeSettings>(
        LocalStorageKey.VOLUME_SETTINGS
      ) ?? {}
    );
  } catch {
    return {};
  }
};

const saveVolumesToStorage = (volumes: TVolumeSettings) => {
  try {
    setLocalStorageItemAsJSON(LocalStorageKey.VOLUME_SETTINGS, volumes);
  } catch {
    // ignore
  }
};

const VolumeControlProvider = memo(
  ({ children }: TVolumeControlProviderProps) => {
    const [volumes, setVolumes] = useState<TVolumeSettings>(
      loadVolumesFromStorage
    );

    const previousVolumesRef = useRef<TVolumeSettings>({});

    const getVolume = useCallback(
      (key: TVolumeKey): number => {
        return volumes[key] ?? 100;
      },
      [volumes]
    );

    const setVolume = useCallback((key: TVolumeKey, volume: number) => {
      setVolumes((prev) => {
        const next = { ...prev, [key]: volume };
        saveVolumesToStorage(next);
        return next;
      });

      if (volume > 0) {
        previousVolumesRef.current[key] = volume;
      }
    }, []);

    const toggleMute = useCallback((key: TVolumeKey) => {
      setVolumes((prev) => {
        const currentVolume = prev[key] ?? 100;
        const isMuted = currentVolume === 0;
        const newVolume = isMuted
          ? (previousVolumesRef.current[key] ?? 100)
          : 0;

        if (!isMuted) {
          previousVolumesRef.current[key] = currentVolume;
        }

        const next = { ...prev, [key]: newVolume };
        saveVolumesToStorage(next);
        return next;
      });
    }, []);

    const getUserVolumeKey = useCallback((userId: number): TVolumeKey => {
      return `user-${userId}`;
    }, []);

    const getUserScreenVolumeKey = useCallback((userId: number): TVolumeKey => {
      return `userscreen-${userId}`;
    }, []);

    const getExternalVolumeKey = useCallback(
      (pluginId: string, key: string): TVolumeKey => {
        return `external-${pluginId}-${key}`;
      },
      []
    );

    return (
      <VolumeControlContext.Provider
        value={{
          volumes,
          getVolume,
          setVolume,
          toggleMute,
          getUserVolumeKey,
          getUserScreenVolumeKey,
          getExternalVolumeKey
        }}
      >
        {children}
      </VolumeControlContext.Provider>
    );
  }
);

const useVolumeControl = () => {
  const context = useContext(VolumeControlContext);

  if (!context) {
    throw new Error(
      'useVolumeControl must be used within VolumeControlProvider'
    );
  }

  return context;
};

export { useVolumeControl, VolumeControlContext, VolumeControlProvider };
export type { TVolumeControlContext, TVolumeKey };
