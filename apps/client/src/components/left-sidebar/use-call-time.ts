import { useVoiceChannelState } from '@/features/server/voice/hooks';
import { useElapsedTime } from '@/hooks/use-elapsed-time';

export function useCallTime(channelId: number) {
  const { activeSince } = useVoiceChannelState(channelId);
  const elapsedTime = useElapsedTime(activeSince ?? null);

  return activeSince ? elapsedTime : null;
}
