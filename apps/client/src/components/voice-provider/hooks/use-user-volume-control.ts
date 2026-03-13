import { useVolumeControl } from '../volume-control-context';

export const useUserVolumeControl = (userId: number) => {
  const { getUserVolumeKey, getVolume, setVolume, toggleMute } =
    useVolumeControl();
  const volumeKey = getUserVolumeKey(userId);
  const volume = getVolume(volumeKey);
  const isMuted = volume === 0;

  return {
    volumeKey,
    volume,
    isMuted,
    setVolume: (val: number) => setVolume(volumeKey, val),
    toggleMute: () => toggleMute(volumeKey)
  };
};
