import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { IconButton } from '@/components/ui/icon-button';
import { useVolumeControl } from '@/components/voice-provider/volume-control-context';
import { cn } from '@/lib/utils';
import type { TExternalStream } from '@sharkord/shared';
import { Headphones, Router, Video, ZoomIn, ZoomOut } from 'lucide-react';
import { memo, useCallback } from 'react';
import { CardControls } from './card-controls';
import { CardGradient } from './card-gradient';
import { useScreenShareZoom } from './hooks/use-screen-share-zoom';
import { useVoiceRefs } from './hooks/use-voice-refs';
import { PinButton } from './pin-button';
import { StreamSettingsPopover } from './stream-settings-popover';

type TExternalStreamControlsProps = {
  isPinned: boolean;
  isZoomEnabled: boolean;
  handlePinToggle: () => void;
  handleToggleZoom: () => void;
  showPinControls: boolean;
  hasVideo: boolean;
  hasAudio: boolean;
  volume: number;
  isMuted: boolean;
  onVolumeChange: (volume: number) => void;
  onMuteToggle: () => void;
};

const ExternalStreamControls = memo(
  ({
    isPinned,
    isZoomEnabled,
    handlePinToggle,
    handleToggleZoom,
    showPinControls,
    hasVideo,
    hasAudio,
    volume,
    isMuted,
    onVolumeChange,
    onMuteToggle
  }: TExternalStreamControlsProps) => {
    return (
      <CardControls>
        {hasAudio && (
          <StreamSettingsPopover
            volume={volume}
            isMuted={isMuted}
            onVolumeChange={onVolumeChange}
            onMuteToggle={onMuteToggle}
          />
        )}
        {showPinControls && hasVideo && isPinned && (
          <IconButton
            variant={isZoomEnabled ? 'default' : 'ghost'}
            icon={isZoomEnabled ? ZoomOut : ZoomIn}
            onClick={handleToggleZoom}
            title={isZoomEnabled ? 'Disable Zoom' : 'Enable Zoom'}
            size="sm"
          />
        )}
        {showPinControls && (
          <PinButton isPinned={isPinned} handlePinToggle={handlePinToggle} />
        )}
      </CardControls>
    );
  }
);

type TExternalStreamCardProps = {
  streamId: number;
  stream: TExternalStream;
  isPinned?: boolean;
  onPin: () => void;
  onUnpin: () => void;
  className?: string;
  showPinControls: boolean;
};

const ExternalStreamCard = memo(
  ({
    streamId,
    stream,
    isPinned = false,
    onPin,
    onUnpin,
    className,
    showPinControls = true
  }: TExternalStreamCardProps) => {
    const {
      externalVideoRef,
      externalAudioRef,
      hasExternalVideoStream,
      hasExternalAudioStream
    } = useVoiceRefs(streamId, stream.pluginId, stream.key);

    const { getVolume, setVolume, toggleMute, getExternalVolumeKey } =
      useVolumeControl();

    const volumeKey = getExternalVolumeKey(stream.pluginId, stream.key);
    const volume = getVolume(volumeKey);
    const isMuted = volume === 0;

    const {
      containerRef,
      isZoomEnabled,
      zoom,
      position,
      isDragging,
      handleToggleZoom,
      handleWheel,
      handleMouseDown,
      handleMouseMove,
      handleMouseUp,
      getCursor,
      resetZoom
    } = useScreenShareZoom();

    const handlePinToggle = useCallback(() => {
      if (isPinned) {
        onUnpin?.();
        resetZoom();
      } else {
        onPin?.();
      }
    }, [isPinned, onPin, onUnpin, resetZoom]);

    const handleVolumeChange = useCallback(
      (newVolume: number) => {
        setVolume(volumeKey, newVolume);
      },
      [volumeKey, setVolume]
    );

    const handleMuteToggle = useCallback(() => {
      toggleMute(volumeKey);
    }, [volumeKey, toggleMute]);

    const hasVideo = stream.tracks?.video && hasExternalVideoStream;
    const hasAudio = stream.tracks?.audio && hasExternalAudioStream;

    return (
      <div
        ref={containerRef}
        className={cn(
          'relative bg-card rounded-lg overflow-hidden group',
          'flex items-center justify-center',
          'w-full h-full',
          'border border-border',
          className
        )}
        onWheel={hasVideo ? handleWheel : undefined}
        onMouseDown={hasVideo ? handleMouseDown : undefined}
        onMouseMove={hasVideo ? handleMouseMove : undefined}
        onMouseUp={hasVideo ? handleMouseUp : undefined}
        onMouseLeave={hasVideo ? handleMouseUp : undefined}
        style={{
          cursor: hasVideo ? getCursor() : 'default'
        }}
      >
        <CardGradient />

        <ExternalStreamControls
          isPinned={isPinned}
          isZoomEnabled={isZoomEnabled}
          handlePinToggle={handlePinToggle}
          handleToggleZoom={handleToggleZoom}
          showPinControls={showPinControls}
          hasVideo={!!hasVideo}
          hasAudio={!!hasAudio}
          volume={volume}
          isMuted={isMuted}
          onVolumeChange={handleVolumeChange}
          onMuteToggle={handleMuteToggle}
        />

        {hasVideo ? (
          <video
            ref={externalVideoRef}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-contain bg-black"
            style={{
              transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 p-8">
            <div className="relative">
              {stream.avatarUrl ? (
                <Avatar className="w-20 h-20 border-2 border-green-500/50">
                  <AvatarImage
                    src={stream.avatarUrl}
                    alt={stream.title || 'External Stream'}
                  />
                  <AvatarFallback className="bg-gradient-to-br from-green-500/30 to-emerald-500/30">
                    <Headphones className="size-10 text-green-400" />
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500/30 to-emerald-500/30 flex items-center justify-center border-2 border-green-500/50">
                  <Headphones className="size-10 text-green-400" />
                </div>
              )}
              {hasAudio && !isMuted && (
                <div className="absolute inset-0 rounded-full animate-pulse bg-green-500/20" />
              )}
            </div>
          </div>
        )}

        {hasAudio && (
          <audio ref={externalAudioRef} autoPlay className="hidden" />
        )}

        <div className="absolute bottom-0 left-0 right-0 p-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-2 min-w-0">
            {stream.avatarUrl ? (
              <img
                src={stream.avatarUrl}
                alt={stream.title || 'External Stream'}
                className="h-5 flex-shrink-0 rounded-full"
              />
            ) : (
              <Router className="size-3.5 text-purple-400 flex-shrink-0" />
            )}
            <span className="text-white font-medium text-xs truncate">
              {stream.title || 'External Stream'}
            </span>

            <div className="flex items-center gap-1 ml-auto">
              {hasVideo && <Video className="size-3 text-blue-400" />}
              {hasAudio && (
                <Headphones
                  className={cn(
                    'size-3',
                    isMuted ? 'text-red-400' : 'text-green-400'
                  )}
                />
              )}
            </div>

            {stream.pluginId && (
              <span className="text-white/50 text-[10px] flex-shrink-0">
                via {stream.pluginId}
              </span>
            )}

            {isZoomEnabled && zoom > 1 && (
              <span className="text-white/70 text-xs flex-shrink-0">
                {Math.round(zoom * 100)}%
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
);

ExternalStreamCard.displayName = 'ExternalStreamCard';

export { ExternalStreamCard };
