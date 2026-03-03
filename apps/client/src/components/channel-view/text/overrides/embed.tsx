import type { TMessageMetadata } from '@sharkord/shared';
import { ChevronDown } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { LinkOverride } from './link';

type TEmbedOverrideProps = {
  metadata: TMessageMetadata;
};

const EmbedOverride = memo(({ metadata }: TEmbedOverrideProps) => {
  const [expanded, setExpanded] = useState(false);

  const toggle = useCallback(() => setExpanded((prev) => !prev), []);

  const domain = (() => {
    try {
      return new URL(metadata.url).hostname;
    } catch {
      return metadata.url;
    }
  })();

  const favicon = metadata.favicons?.[0];
  const image = metadata.images?.[0];

  return (
    <div className="max-w-md rounded-md border-l-4 border-primary bg-muted/50 overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/80 transition-colors cursor-pointer"
      >
        {favicon && (
          <img
            src={favicon}
            alt=""
            className="size-4 shrink-0 rounded-sm"
            crossOrigin="anonymous"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        <span className="text-muted-foreground truncate flex-1">
          {metadata.siteName || domain}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && (
        <div className="flex gap-3 px-3 pb-3">
          <div className="flex flex-col gap-1 min-w-0 flex-1">
            {metadata.title && (
              <LinkOverride
                link={metadata.url}
                label={metadata.title}
                className="font-semibold text-sm line-clamp-2"
              />
            )}
            {metadata.description && (
              <p className="text-xs text-muted-foreground line-clamp-3">
                {metadata.description}
              </p>
            )}
          </div>
          {image && (
            <img
              src={image}
              alt=""
              className="size-16 rounded-md object-cover shrink-0"
              crossOrigin="anonymous"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          )}
        </div>
      )}
    </div>
  );
});

export { EmbedOverride };
