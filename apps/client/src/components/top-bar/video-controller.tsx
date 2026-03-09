import { UserAvatar } from '@/components/user-avatar';
import { useVoiceUsersByChannelId } from '@/features/server/hooks';
import { useOwnUserId, useUserById } from '@/features/server/users/hooks';
import {
  useVoice,
  useVoiceChannelVideoExternalStreams
} from '@/features/server/voice/hooks';
import { cn } from '@/lib/utils';
import { StreamKind } from '@sharkord/shared';
import {
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Tooltip
} from '@sharkord/ui';
import { Monitor, Router, ScreenShareOff, Video, VideoOff } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';

type VideoStreamControlProps = {
  remoteId: number;
  kind: StreamKind.VIDEO | StreamKind.SCREEN | StreamKind.EXTERNAL_VIDEO;
  name: string;
  type: 'webcam' | 'screen' | 'external';
  isConnected: boolean;
  onDisconnect: () => void;
  onReconnect: () => void;
  disabled?: boolean;
};

type VideoControllerProps = {
  channelId: number;
};

const VideoStreamControl = memo(
  ({
    remoteId,
    kind: _kind,
    name,
    type,
    isConnected,
    onDisconnect,
    onReconnect,
    disabled = false
  }: VideoStreamControlProps) => {
    const user = useUserById(type !== 'external' ? remoteId : 0);

    const Icon =
      type === 'webcam' ? Video : type === 'screen' ? Monitor : Router;

    return (
      <div className="flex items-center gap-3 py-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {type !== 'external' && user ? (
            <UserAvatar userId={user.id} className="h-6 w-6" />
          ) : (
            <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <Icon className="h-3 w-3 text-muted-foreground" />
            </div>
          )}
          <span className="text-sm truncate flex-1">{name}</span>
          {type === 'screen' && (
            <Monitor className="h-3 w-3 text-muted-foreground" />
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {isConnected ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onDisconnect}
              disabled={disabled}
              className="h-6 px-2"
              title="Disconnect video stream"
            >
              <VideoOff className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onReconnect}
              disabled={disabled}
              className="h-6 px-2"
              title="Reconnect video stream"
            >
              <Video className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  }
);

VideoStreamControl.displayName = 'VideoStreamControl';

type VideoStream = {
  remoteId: number;
  kind: StreamKind.VIDEO | StreamKind.SCREEN | StreamKind.EXTERNAL_VIDEO;
  name: string;
  type: 'webcam' | 'screen' | 'external';
};

const VideoController = memo(({ channelId }: VideoControllerProps) => {
  const voiceUsers = useVoiceUsersByChannelId(channelId);
  const externalVideoStreams = useVoiceChannelVideoExternalStreams(channelId);
  const ownUserId = useOwnUserId();

  const {
    ownVoiceState,
    toggleVideoStreams,
    stopVideoStreamConsumer,
    consumeVideoStream,
    remoteUserStreams,
    externalStreams
  } = useVoice();

  const videoStreams = useMemo(() => {
    const streams: VideoStream[] = [];

    voiceUsers.forEach((voiceUser) => {
      if (voiceUser.id === ownUserId) return;

      if (voiceUser.state.webcamEnabled) {
        streams.push({
          remoteId: voiceUser.id,
          kind: StreamKind.VIDEO,
          name: voiceUser.name,
          type: 'webcam'
        });
      }

      if (voiceUser.state.sharingScreen) {
        streams.push({
          remoteId: voiceUser.id,
          kind: StreamKind.SCREEN,
          name: voiceUser.name,
          type: 'screen'
        });
      }
    });

    externalVideoStreams.forEach((stream) => {
      streams.push({
        remoteId: stream.streamId,
        kind: StreamKind.EXTERNAL_VIDEO,
        name: stream.title || 'External Video',
        type: 'external'
      });
    });

    return streams;
  }, [voiceUsers, externalVideoStreams, ownUserId]);

  const isStreamConnected = useCallback(
    (
      remoteId: number,
      kind: StreamKind.VIDEO | StreamKind.SCREEN | StreamKind.EXTERNAL_VIDEO
    ) => {
      if (kind === StreamKind.EXTERNAL_VIDEO) {
        return !!externalStreams[remoteId]?.videoStream;
      }
      return !!remoteUserStreams[remoteId]?.[kind];
    },
    [remoteUserStreams, externalStreams]
  );

  const handleDisconnect = useCallback(
    (
      remoteId: number,
      kind: StreamKind.VIDEO | StreamKind.SCREEN | StreamKind.EXTERNAL_VIDEO
    ) => {
      stopVideoStreamConsumer(remoteId, kind);
    },
    [stopVideoStreamConsumer]
  );

  const handleReconnect = useCallback(
    async (
      remoteId: number,
      kind: StreamKind.VIDEO | StreamKind.SCREEN | StreamKind.EXTERNAL_VIDEO
    ) => {
      await consumeVideoStream(remoteId, kind);
    },
    [consumeVideoStream]
  );

  const videoStreamsEnabled = ownVoiceState.videoStreamsEnabled;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 transition-all duration-200 ease-in-out"
        >
          <Tooltip content="Video Controls" asChild={false}>
            <div
              className={cn(
                'transition-all duration-200',
                videoStreamsEnabled
                  ? 'text-muted-foreground hover:text-foreground'
                  : 'text-red-400'
              )}
            >
              <ScreenShareOff className="w-4 h-4" />
            </div>
          </Tooltip>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80">
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-sm">Video Controls</h4>
            <span className="text-xs text-muted-foreground">
              {videoStreams.length}{' '}
              {videoStreams.length === 1 ? 'stream' : 'streams'}
            </span>
          </div>

          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'flex-1 transition-all duration-200',
                videoStreamsEnabled
                  ? 'bg-secondary hover:bg-secondary/80 text-muted-foreground hover:text-foreground'
                  : 'bg-red-500/15 hover:bg-red-500/25 text-red-400 hover:text-red-300'
              )}
              onClick={toggleVideoStreams}
            >
              <ScreenShareOff className="h-4 w-4 mr-2" />
              {videoStreamsEnabled
                ? 'Turn off all video streams'
                : 'Turn on all video streams'}
            </Button>
          </div>

          <div className="space-y-1 max-h-96 overflow-y-auto">
            {videoStreams.map((stream) => (
              <VideoStreamControl
                key={`${stream.remoteId}-${stream.kind}`}
                remoteId={stream.remoteId}
                kind={stream.kind}
                name={stream.name}
                type={stream.type}
                isConnected={isStreamConnected(stream.remoteId, stream.kind)}
                onDisconnect={() =>
                  handleDisconnect(stream.remoteId, stream.kind)
                }
                onReconnect={() =>
                  handleReconnect(stream.remoteId, stream.kind)
                }
                disabled={!videoStreamsEnabled}
              />
            ))}
            {videoStreams.length === 0 && (
              <div className="text-sm text-muted-foreground py-4 text-center">
                No remote video streams available.
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
});

VideoController.displayName = 'VideoController';

export { VideoController };
