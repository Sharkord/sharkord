import { requestConfirmation } from '@/features/dialogs/actions';
import { cn } from '@/lib/utils';
import { ExternalLink } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';

type TLinkOverrideProps = {
  link: string;
  label?: string;
  className?: string;
};

const isInternalLink = (href: string): boolean => {
  try {
    const url = new URL(href);
    return url.host === window.location.host;
  } catch {
    return false;
  }
};

const LinkOverride = memo(({ link, label, className }: TLinkOverrideProps) => {
  const internal = useMemo(() => isInternalLink(link), [link]);

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();

      if (internal) {
        window.open(link, '_blank', 'noopener,noreferrer');
        return;
      }

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
    [link, internal]
  );

  return (
    <span
      className={cn('inline-flex items-center gap-0.5 cursor-pointer text-primary hover:underline', className)}
      onClick={handleClick}
      role="link"
      tabIndex={0}
    >
      {label || link}
      {!internal && <ExternalLink size={12} className="inline shrink-0" />}
    </span>
  );
});

export { LinkOverride };
