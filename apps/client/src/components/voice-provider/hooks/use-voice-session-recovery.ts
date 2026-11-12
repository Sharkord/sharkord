import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { useIsConnected } from '@/features/server/hooks';
import { leaveVoice, requestVoiceJoin } from '@/features/server/voice/actions';
import { voiceLogger } from '@/helpers/browser-logger';
import type { RtpCapabilities } from 'mediasoup-client/types';
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TUseVoiceSessionRecoveryParams = {
  init: (
    routerRtpCapabilities: RtpCapabilities,
    channelId: number
  ) => Promise<void>;
};

const useVoiceSessionRecovery = ({ init }: TUseVoiceSessionRecoveryParams) => {
  const { t } = useTranslation('common');
  const isConnected = useIsConnected();
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const wasConnectedRef = useRef(isConnected);

  const rejoin = useCallback(
    async (channelId: number) => {
      voiceLogger.info('session: rejoining after reconnect', { channelId });

      const routerRtpCapabilities = await requestVoiceJoin(channelId);

      if (!routerRtpCapabilities) return;

      try {
        await init(routerRtpCapabilities, channelId);
      } catch {
        await leaveVoice({ reason: 'init_failed' });

        toast.error(t('failedInitVoiceConnection'));
      }
    },
    [init, t]
  );

  useEffect(() => {
    const wasConnected = wasConnectedRef.current;

    wasConnectedRef.current = isConnected;

    if (wasConnected || !isConnected || !currentVoiceChannelId) return;

    rejoin(currentVoiceChannelId);
  }, [isConnected, currentVoiceChannelId, rejoin]);
};

export { useVoiceSessionRecovery };
