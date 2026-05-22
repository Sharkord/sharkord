import {
  useVolumeControl,
  type TVolumeKey
} from '@/components/voice-provider/volume-control-context';
import { useWebRtcSimulcastEnabled } from '@/features/server/hooks';
import { useOwnUserId, useUserById } from '@/features/server/users/hooks';
import { useVoice } from '@/features/server/voice/hooks';
import { useStreamQualityData } from '@/hooks/use-stream-quality-data';
import { cn } from '@/lib/utils';
import { StreamKind } from '@sharkord/shared';
import { IconButton } from '@sharkord/ui';
import { Monitor, ZoomIn, ZoomOut } from 'lucide-react';
import { memo, useCallback, useMemo, type RefObject } from 'react';
import { CardControls } from './card-controls';
import { CardGradient } from './card-gradient';
import { FullscreenButton } from './fullscreen-button';
import { useFullscreen } from './hooks/use-fullscreen';
import { useScreenShareZoom } from './hooks/use-screen-share-zoom';
import { useVideoStats } from './hooks/use-video-stats';
import { useVoiceRefs } from './hooks/use-voice-refs';
import { PictureInPictureButton } from './picture-in-picture-button';
import { PinButton } from './pin-button';
import { QualityButton } from './quality-button';
import { VolumeButton } from './volume-button';

type TScreenShareControlsProps = {
  isPinned: boolean;
  isFullscreen: boolean;
  isZoomEnabled: boolean;
  handlePinToggle: () => void;
  handleToggleFullscreen: () => void;
  handleToggleZoom: () => void;
  showPinControls: boolean;
  showAudioControl: boolean;
  showQualityControl: boolean;
  disableQualityControl: boolean;
  volumeKey: TVolumeKey;
  videoRef: RefObject<HTMLVideoElement | null>;
  userId: number;
};

const ScreenShareControls = memo(
  ({
    isPinned,
    isFullscreen,
    isZoomEnabled,
    handlePinToggle,
    handleToggleFullscreen,
    handleToggleZoom,
    showPinControls,
    showAudioControl,
    showQualityControl,
    disableQualityControl,
    volumeKey,
    videoRef,
    userId
  }: TScreenShareControlsProps) => {
    return (
      <CardControls>
        {showAudioControl && <VolumeButton volumeKey={volumeKey} />}
        {showQualityControl && (
          <QualityButton
            streamId={userId}
            kind={StreamKind.SCREEN}
            disabled={disableQualityControl}
          />
        )}
        <PictureInPictureButton videoRef={videoRef} />
        {showPinControls && isPinned && (
          <IconButton
            variant={isZoomEnabled ? 'default' : 'ghost'}
            icon={isZoomEnabled ? ZoomOut : ZoomIn}
            onClick={handleToggleZoom}
            title={isZoomEnabled ? 'Disable Zoom' : 'Enable Zoom'}
            size="sm"
          />
        )}
        <FullscreenButton
          isFullscreen={isFullscreen}
          handleToggleFullscreen={handleToggleFullscreen}
        />
        {showPinControls && (
          <PinButton isPinned={isPinned} handlePinToggle={handlePinToggle} />
        )}
      </CardControls>
    );
  }
);

type TScreenShareCardProps = {
  userId: number;
  isPinned?: boolean;
  onPin: () => void;
  onUnpin: () => void;
  className?: string;
  showPinControls: boolean;
};

const ScreenShareCard = memo(
  ({
    userId,
    isPinned = false,
    onPin,
    onUnpin,
    className,
    showPinControls = true
  }: TScreenShareCardProps) => {
    const user = useUserById(userId);
    const ownUserId = useOwnUserId();
    const { getUserScreenVolumeKey } = useVolumeControl();
    const isOwnUser = ownUserId === userId;
    const webRtcSimulcastEnabled = useWebRtcSimulcastEnabled();
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

    const { isSimulcastScreenConsumer, qualityLabel } = useStreamQualityData(
      userId,
      StreamKind.SCREEN
    );

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
          'relative bg-card',
          'flex items-center justify-center',
          'w-full h-full',
          isFullscreen
            ? 'rounded-none border-none'
            : 'rounded-lg overflow-hidden border border-border',
          (!isFullscreen || isOverlayVisible) && 'group',
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

        <ScreenShareControls
          isPinned={isPinned}
          isFullscreen={isFullscreen}
          isZoomEnabled={isZoomEnabled}
          handlePinToggle={handlePinToggle}
          handleToggleFullscreen={handleToggleFullscreen}
          handleToggleZoom={handleToggleZoom}
          showPinControls={showPinControls}
          showAudioControl={!isOwnUser && hasScreenShareAudioStream}
          showQualityControl={!isOwnUser && webRtcSimulcastEnabled}
          disableQualityControl={!isSimulcastScreenConsumer}
          volumeKey={volumeKey}
          videoRef={screenShareRef}
          userId={userId}
        />

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

        <div className="absolute bottom-0 left-0 right-0 p-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="flex items-center gap-2 min-w-0">
            <Monitor className="size-3.5 text-purple-400 shrink-0" />
            <span className="text-white font-medium text-xs truncate">
              {user.name}'s screen
            </span>
            {(videoStats || codec || qualityLabel) && (
              <span className="text-white/50 text-xs shrink-0">
                {codec}
                {codec && videoStats && ' '}
                {videoStats && (
                  <>
                    {videoStats.width}x{videoStats.height}
                    {videoStats.frameRate > 0 && ` ${videoStats.frameRate}fps`}
                  </>
                )}
                {(codec || videoStats) && qualityLabel && ' '}
                {qualityLabel && `(${qualityLabel})`}
              </span>
            )}
            {isZoomEnabled && zoom > 1 && (
              <span className="text-white/70 text-xs ml-auto shrink-0">
                {Math.round(zoom * 100)}%
              </span>
            )}
          </div>
        </div>
      </div>
    );
  }
);

ScreenShareCard.displayName = 'ScreenShareCard';

export { ScreenShareCard };
