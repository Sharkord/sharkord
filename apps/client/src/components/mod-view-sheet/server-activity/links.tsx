import { PaginatedList } from '@/components/paginated-list';
import { Button } from '@sharkord/ui';
import { ExternalLink, Link as LinkIcon } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useModViewContext } from '../context';

type TLinkCardProps = {
  url: string;
  onOpen: () => void;
};

const LinkCard = memo(({ url, onOpen }: TLinkCardProps) => {
  const truncatedUrl = useMemo(() => {
    const maxLength = 50;

    if (url.length <= maxLength) return url;

    return `${url.slice(0, maxLength)}...`;
  }, [url]);

  const domain = useMemo(() => {
    try {
      const hostname = new URL(url).hostname;
      return hostname.replace(/^www\./, '');
    } catch {
      return 'Invalid URL';
    }
  }, [url]);

  return (
    <div className="py-2 px-1 border-b border-border last:border-0 bg-secondary/50 rounded-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <LinkIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate" title={url}>
              {truncatedUrl}
            </div>
            <div className="text-xs text-muted-foreground">{domain}</div>
          </div>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onOpen}
          className="flex-shrink-0 ml-2"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
});

const Links = memo(() => {
  const { links } = useModViewContext();

  const onOpenClick = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  const renderItem = useCallback(
    (url: string) => <LinkCard url={url} onOpen={() => onOpenClick(url)} />,
    [onOpenClick]
  );

  const searchFilter = useCallback(
    (url: string, term: string) =>
      url.toLowerCase().includes(term.toLowerCase()),
    []
  );

  return (
    <PaginatedList
      items={links}
      renderItem={renderItem}
      searchFilter={searchFilter}
      searchPlaceholder="Search links..."
      emptyMessage="No links found."
      itemsPerPage={8}
    />
  );
});

export { Links };
