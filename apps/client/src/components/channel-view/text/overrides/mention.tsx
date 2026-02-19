import { MentionChip } from '@/components/mention-chip';
import { memo } from 'react';

const MentionOverride = memo(({ userId }: { userId: number }) => (
  <MentionChip userId={userId} />
));

MentionOverride.displayName = 'MentionOverride';

export { MentionOverride };
