import { useVolumeControl } from '@/components/voice-provider/volume-control-context';
import { useOwnUserId, useUserById } from '@/features/server/users/hooks';
import { useVoice } from '@/features/server/voice/hooks';
import { cn } from '@/lib/utils';
import { StreamKind } from '@sharkord/shared';
import { IconButton } from '@sharkord/ui';
import { Monitor, ZoomIn, ZoomOut } from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';
import { CardGradient } from './card-gradient';
import { FullscreenButton } from './fullscreen-button';
import { useFullscreen } from './hooks/use-fullscreen';
import { useScreenShareZoom } from './hooks/use-screen-share-zoom';
import { useVideoStats } from './hooks/use-video-stats';
import { useVoiceRefs } from './hooks/use-voice-refs';
import { PinButton } from './pin-button';
import { VolumeButton } from './volume-button';

type TScreenShareCardProps = {
  userId: number;
  isPinned?: boolean;
  onPin: () => void;
  onUnpin: () => void;
  className?: string;
  showPinControls: boolean;
  aCardIsPinned?: boolean;
};

const ScreenShareCard = memo(
  ({
    userId,
    isPinned = false,
    onPin,
    onUnpin,
    className,
    showPinControls = true,
    aCardIsPinned = false
  }: TScreenShareCardProps) => {
    const user = useUserById(userId);
    const ownUserId = useOwnUserId();
    const { getUserScreenVolumeKey } = useVolumeControl();
    const isOwnUser = ownUserId === userId;
    const volumeKey = getUserScreenVolumeKey(userId);
    const {
      screenShareRef,
      screenShareAudioRef,
      hasScreenShareStream,
      hasScreenShareAudioStream
    } = useVoiceRefs(userId);
    const { transportStats, getConsumerCodec } = useVoice();
    const videoStats = useVideoStats(screenShareRef, hasScreenShareStream);

    const codec = useMemo(() => {
      let mimeType: string | undefined;

      if (isOwnUser) {
        mimeType = transportStats.screenShare?.codec;
      } else {
        mimeType = getConsumerCodec(userId, StreamKind.SCREEN);
      }

      if (!mimeType) return null;

      const parts = mimeType.split('/');

      return parts.length > 1 ? parts[1] : mimeType;
    }, [
      isOwnUser,
      transportStats.screenShare?.codec,
      getConsumerCodec,
      userId
    ]);

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

    const {
      isFullscreen,
      isOverlayVisible,
      toggleFullscreen,
      handleDoubleClick
    } = useFullscreen(containerRef);

    const handleToggleFullscreen = useCallback(() => {
      resetZoom();
      toggleFullscreen();
    }, [resetZoom, toggleFullscreen]);

    const handlePinToggle = useCallback(() => {
      if (isPinned) {
        onUnpin?.();
        resetZoom();
      } else {
        onPin?.();
      }
    }, [isPinned, onPin, onUnpin, resetZoom]);

    if (!user || !hasScreenShareStream) return null;

    return (
      <div
        ref={containerRef}
        className={cn(
          'relative bg-card group/screen-share-card',
          'flex items-center justify-center',
          'size-full',
          isFullscreen
            ? 'rounded-none border-none'
            : 'rounded overflow-hidden border border-border',
          className
        )}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
        style={{
          cursor: isFullscreen && !isOverlayVisible ? 'none' : getCursor()
        }}
      >
        <CardGradient />

        <video
          ref={screenShareRef}
          autoPlay
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-contain bg-black"
          style={{
            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
        />

        <audio
          ref={screenShareAudioRef}
          className="hidden"
          autoPlay
          playsInline
        />

        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 flex justify-between',
            isPinned ? 'p-4 gap-3' : aCardIsPinned ? 'p-1 gap-1' : 'p-4 gap-3',
            'hidden group-hover/screen-share-card:flex',
            'transition-[visibility] duration-200 ease-out'
          )}
        >
          <div
            className={cn(
              'inline-flex min-w-0 min-h-4 py-2 items-center bg-black/70 rounded overflow-hidden truncate',
              isPinned
                ? 'gap-3 px-3'
                : aCardIsPinned
                  ? 'gap-2 px-2'
                  : 'gap-3 px-3'
            )}
          >
            <Monitor
              className={cn(
                'text-purple-400 shrink-0',
                isPinned ? 'size-4' : aCardIsPinned ? 'size-3' : 'size-4'
              )}
            />
            <p
              className={cn(
                isPinned ? 'text-sm' : aCardIsPinned ? 'text-xs' : 'text-sm',
                'leading-none truncate'
              )}
            >
              {user.name}'s screen
              {(videoStats || codec) && (
                <span className="text-muted-foreground text-xs ml-2 leading-none">
                  {codec}
                  {codec && videoStats && ' '}
                  {videoStats && (
                    <>
                      {videoStats.width}x{videoStats.height}
                      {videoStats.frameRate > 0 &&
                        ` ${videoStats.frameRate}fps`}
                    </>
                  )}
                </span>
              )}
              {isZoomEnabled && zoom > 1 && (
                <span className="text-white/70 text-xs ml-2 leading-none">
                  {Math.round(zoom * 100)}%
                </span>
              )}
            </p>
          </div>

          <div
            className={cn(
              'inline-flex min-h-4 gap-3 items-center rounded',
              isPinned ? 'gap-2' : aCardIsPinned ? 'gap-1' : 'gap-2'
            )}
          >
            {!isOwnUser && hasScreenShareAudioStream && (
              <VolumeButton
                volumeKey={volumeKey}
                size={isPinned ? 'sm' : aCardIsPinned ? 'xs' : 'sm'}
                className={cn(
                  'bg-black/70 rounded px-3 py-2 hover:bg-black/80',
                  isPinned ? 'px-3' : aCardIsPinned ? 'px-2' : 'px-3'
                )}
              />
            )}
            {showPinControls && isPinned && (
              <IconButton
                variant={isZoomEnabled ? 'default' : 'ghost'}
                icon={isZoomEnabled ? ZoomOut : ZoomIn}
                onClick={handleToggleZoom}
                title={isZoomEnabled ? 'Disable Zoom' : 'Enable Zoom'}
                size={isPinned ? 'sm' : aCardIsPinned ? 'xs' : 'sm'}
                className={cn(
                  'bg-black/70 rounded px-3 py-2 hover:bg-black/80',
                  isPinned ? 'px-3' : aCardIsPinned ? 'px-2' : 'px-3',
                  isZoomEnabled &&
                    'bg-zinc-300/80 text-zinc-800 hover:bg-zinc-400/90 hover:text-zinc-900'
                )}
              />
            )}
            <FullscreenButton
              isFullscreen={isFullscreen}
              handleToggleFullscreen={handleToggleFullscreen}
              size={isPinned ? 'sm' : aCardIsPinned ? 'xs' : 'sm'}
              className={cn(
                'bg-black/70 rounded px-3 py-2 hover:bg-black/80',
                isPinned ? 'px-3' : aCardIsPinned ? 'px-2' : 'px-3',
                isFullscreen &&
                  'bg-zinc-300/80 text-zinc-800 hover:bg-zinc-400/90 hover:text-zinc-900'
              )}
            />
            {showPinControls && (
              <PinButton
                isPinned={isPinned}
                handlePinToggle={handlePinToggle}
                size={isPinned ? 'sm' : aCardIsPinned ? 'xs' : 'sm'}
                className={cn(
                  'bg-black/70 rounded px-3 py-2 hover:bg-black/80',
                  isPinned ? 'px-3' : aCardIsPinned ? 'px-2' : 'px-3',
                  isPinned &&
                    'bg-zinc-300/80 text-zinc-800 hover:bg-zinc-400/90 hover:text-zinc-900'
                )}
              />
            )}
          </div>
        </div>
      </div>
    );
  }
);

ScreenShareCard.displayName = 'ScreenShareCard';

export { ScreenShareCard };
