import { memo, useCallback } from 'react';
import { Conversation } from './conversation';
import { TextTopbar } from './text-top-bar';

type TChannelProps = {
  channelId: number;
  onClose?: () => void;
};

const TextChannel = memo(({ channelId, onClose }: TChannelProps) => {
  const renderHeader = useCallback(
    (scrollToMessage: (messageId: number) => Promise<void>) => (
      <TextTopbar
        onScrollToMessage={scrollToMessage}
        channelId={channelId}
        onClose={onClose}
      />
    ),
    [channelId, onClose]
  );

  return <Conversation channelId={channelId} renderHeader={renderHeader} />;
});

export { TextChannel };
