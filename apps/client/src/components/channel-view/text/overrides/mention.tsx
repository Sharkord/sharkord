import { MentionChip } from '@/components/mention-chip';
import { memo } from 'react';

type TMentionOverrideProps = {
  userId: number;
};

const MentionOverride = memo(({ userId }: TMentionOverrideProps) => (
  <MentionChip userId={userId} />
));

export { MentionOverride };
