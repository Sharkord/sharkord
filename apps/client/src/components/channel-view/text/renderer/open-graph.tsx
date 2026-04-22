import { cn } from '@/lib/utils';
import { ExternalLink, Globe } from 'lucide-react';
import { memo } from 'react';
import { OverrideLayout } from '../overrides/layout';
import type { TFoundOpenGraph } from './types';

type TOpenGraphProps = {
  previews: TFoundOpenGraph[];
};

const OpenGraph = memo(({ previews }: TOpenGraphProps) => {
  return previews.map((preview) => (
    <OverrideLayout key={preview.key}>
      <a
        href={preview.url}
        target="_blank"
        rel="noreferrer"
        className={cn(
          'flex max-w-[min(100%,32rem)] flex-col overflow-hidden rounded border border-border/70 bg-card/90 no-underline transition hover:border-primary/30 hover:bg-card',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
        )}
      >
        {preview.imageUrl && (
          <div className="h-32 w-full overflow-hidden border-b border-border/60 bg-muted/40 sm:h-36">
            <img
              src={preview.imageUrl}
              alt={preview.title || preview.siteName || preview.hostname}
              className="block h-full w-full object-cover object-center"
              loading="lazy"
            />
          </div>
        )}

        <div className="flex flex-col gap-1.5 p-3 text-foreground">
          <div className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-[11px]">
            {preview.faviconUrl ? (
              <img
                src={preview.faviconUrl}
                alt=""
                className="h-3.5 w-3.5 shrink-0 rounded-full object-cover"
                loading="lazy"
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <Globe className="h-3.5 w-3.5 shrink-0 rounded-full" />
            )}

            <span className="min-w-0 truncate">
              {preview.siteName || preview.hostname}
            </span>

            <ExternalLink className="ml-auto h-3 w-3 shrink-0" />
          </div>

          <div
            className={cn(
              'overflow-hidden text-sm leading-5 font-semibold [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]'
            )}
          >
            {preview.title || preview.siteName || preview.hostname}
          </div>

          {preview.description && (
            <div className="text-muted-foreground overflow-hidden text-[13px] leading-5 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
              {preview.description}
            </div>
          )}

          <div className="text-muted-foreground truncate text-[11px]">
            {preview.hostname}
          </div>
        </div>
      </a>
    </OverrideLayout>
  ));
});

export { OpenGraph };
