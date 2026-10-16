import { UserAvatarStack } from '@/components/user-avatar-stack';
import type { TThreadSummary } from '@sharkord/shared';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

type TThreadRepliesSummaryProps = TThreadSummary & {
  avatarClassName?: string;
};

const ThreadRepliesSummary = memo(
  ({
    replyCount,
    replyUserIds,
    avatarClassName
  }: TThreadRepliesSummaryProps) => {
    const { t } = useTranslation('common');

    return (
      <div className="flex items-center gap-1.5">
        <UserAvatarStack userIds={replyUserIds} className={avatarClassName} />
        <span>{t('reply', { count: replyCount })}</span>
      </div>
    );
  }
);

export { ThreadRepliesSummary };
