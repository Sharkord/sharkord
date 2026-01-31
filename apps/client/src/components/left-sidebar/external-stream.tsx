import type { TExternalStreamTracks } from '@sharkord/shared';
import { Headphones, Router, Video } from 'lucide-react';
import { memo } from 'react';
import { Tooltip } from '../ui/tooltip';

type TExternalStreamProps = {
  title: string;
  tracks?: TExternalStreamTracks;
  pluginId?: string;
  avatarUrl?: string;
};

const ExternalStream = memo(
  ({ title, tracks, pluginId, avatarUrl }: TExternalStreamProps) => {
    const hasVideo = tracks?.video;
    const hasAudio = tracks?.audio;

    return (
      <div className="flex items-center gap-2 px-2 py-1 rounded hover:bg-accent/30 text-sm">
        <Tooltip
          content={
            pluginId ? `External Stream (${pluginId})` : 'External Stream'
          }
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={title}
              className="h-5 w-5 rounded object-cover"
            />
          ) : (
            <Router className="h-5 w-5 text-muted-foreground opacity-60" />
          )}
        </Tooltip>

        <span className="flex-1 text-muted-foreground truncate text-xs">
          {title}
        </span>

        <div className="flex items-center gap-1 opacity-60">
          {hasVideo && <Video className="h-3 w-3 text-blue-500" />}
          {hasAudio && <Headphones className="h-3 w-3 text-green-500" />}
        </div>
      </div>
    );
  }
);

export { ExternalStream };
