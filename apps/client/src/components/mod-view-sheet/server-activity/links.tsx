import { PaginatedList } from '@/components/paginated-list';
import { Button } from '@sharkord/ui';
import { ExternalLink, Link as LinkIcon } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useModViewContext } from '../context';

type TLinkCardProps = {
  url: string;
  onOpen: () => void;
};

const LinkCard = memo(({ url, onOpen }: TLinkCardProps) => {
  const { t } = useTranslation('settings');

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
      return t('naValue');
    }
  }, [url, t]);

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

const searchFilter = (url: string, term: string) =>
  url.toLowerCase().includes(term.toLowerCase());

const Links = memo(() => {
  const { t } = useTranslation('settings');
  const { links } = useModViewContext();

  const onOpenClick = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  return (
    <PaginatedList items={links} itemsPerPage={8} searchFilter={searchFilter}>
      <PaginatedList.Search
        placeholder={t('searchLinksPlaceholder')}
        className="mb-2"
      />
      <PaginatedList.Empty className="text-xs">
        {t('noLinksFound')}
      </PaginatedList.Empty>
      <PaginatedList.List<string> className="flex flex-col gap-2">
        {(url) => <LinkCard url={url} onOpen={() => onOpenClick(url)} />}
      </PaginatedList.List>
      <PaginatedList.Pagination className="mt-2" />
    </PaginatedList>
  );
});

export { Links };
