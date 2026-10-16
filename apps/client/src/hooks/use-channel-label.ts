import { useChannelById } from '@/features/server/channels/hooks';
import { useTranslation } from 'react-i18next';

const useChannelLabel = (channelId: number) => {
  const { t } = useTranslation('common');
  const channel = useChannelById(channelId);

  if (!channel) return '';

  return channel.isDm ? t('directMessage') : `#${channel.name}`;
};

export { useChannelLabel };
