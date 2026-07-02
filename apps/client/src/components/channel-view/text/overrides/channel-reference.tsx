import { ChannelChip } from '@/components/channel-chip';
import { memo } from 'react';

type TChannelReferenceOverrideProps = {
  channelId: number;
};

const ChannelReferenceOverride = memo(
  ({ channelId }: TChannelReferenceOverrideProps) => (
    <ChannelChip channelId={channelId} />
  )
);

export { ChannelReferenceOverride };
