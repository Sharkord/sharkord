import type { TMessageMetadata } from '@sharkord/shared';
import { ChevronDown } from 'lucide-react';
import { memo, useCallback, useMemo, useState } from 'react';
import LiteYouTubeEmbed from 'react-lite-youtube-embed';
import 'react-lite-youtube-embed/dist/LiteYouTubeEmbed.css';
import { LinkOverride } from './link';

function getYoutubeVideoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (!u.hostname.match(/youtube\.com|youtu\.be/)) return null;

    // youtu.be/VIDEO_ID
    if (u.hostname.includes('youtu.be')) {
      const id = u.pathname.slice(1);
      return id.length === 11 ? id : null;
    }

    // youtube.com/watch?v=VIDEO_ID
    const v = u.searchParams.get('v');
    if (v?.length === 11) return v;

    // youtube.com/shorts/VIDEO_ID, /embed/VIDEO_ID, /live/VIDEO_ID, /v/VIDEO_ID
    const pathMatch = u.pathname.match(/^\/(shorts|embed|live|v)\/([^/?#]+)/);
    if (pathMatch?.[2]?.length === 11) return pathMatch[2];

    return null;
  } catch {
    return null;
  }
}

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
  const youtubeId = useMemo(() => getYoutubeVideoId(metadata.url), [metadata.url]);

  return (
    <div className="max-w-md rounded-md border-l-4 border-primary bg-muted/50 overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted/80 transition-colors cursor-pointer"
      >
        {expanded && favicon && (
          <img
            src={favicon}
            alt=""
            className="size-4 shrink-0 rounded-sm"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        )}
        <span className="text-muted-foreground truncate flex-1">
          {metadata.siteName || domain}
          {metadata.title ? ` — ${metadata.title}` : ''}
        </span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      {expanded && youtubeId && (
        <div className="px-3 pb-3">
          <div className="rounded-md overflow-hidden">
            <LiteYouTubeEmbed id={youtubeId} title={metadata.title || 'YouTube video'} />
          </div>
        </div>
      )}

      {expanded && !youtubeId && (
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
