import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { usePreventExit } from '@/hooks/use-prevent-exit';
import { memo } from 'react';

const PreventBrowser = memo(() => {
  const currentVoiceChannelId = useCurrentVoiceChannelId();

  // this will prevent the user from closing the browser tab/window when connected to a voice channel
  usePreventExit(!!currentVoiceChannelId);

  return null;
});

export { PreventBrowser };
