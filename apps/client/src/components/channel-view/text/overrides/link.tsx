import { requestConfirmation } from '@/features/dialogs/actions';
import { cn } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';
import { memo, useCallback } from 'react';

type TLinkOverrideProps = {
  link: string;
  label?: string;
  className?: string;
};

const LinkOverride = memo(({ link, label, className }: TLinkOverrideProps) => {
  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      const confirmed = await requestConfirmation({
        title: 'Open external link',
        message: `You are about to open an external link:\n\n${link}\n\nAre you sure you want to continue?`,
        confirmLabel: 'Open',
        cancelLabel: 'Cancel',
        variant: 'info'
      });
      if (confirmed) {
        window.open(link, '_blank', 'noopener,noreferrer');
      }
    },
    [link]
  );

  return (
    <span
      className={cn('inline-flex items-center gap-0.5 cursor-pointer text-primary hover:underline', className)}
      onClick={handleClick}
      role="link"
      tabIndex={0}
    >
      {label || link}
      <ExternalLink size={12} className="inline shrink-0" />
    </span>
  );
});

export { LinkOverride };
