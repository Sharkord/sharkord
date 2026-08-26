import {
  useVolumeControl,
  type TVolumeKey
} from '@/components/voice-provider/volume-control-context';
import {
  useShowUserBannersInVoice,
  useVoice
} from '@/features/server/voice/hooks';
import { cn } from '@/lib/utils';
import { StreamKind, type TExternalStream } from '@sharkord/shared';
import { Avatar, AvatarFallback, AvatarImage, IconButton } from '@sharkord/ui';
import { Headphones, Router, Video, ZoomIn, ZoomOut } from 'lucide-react';
import { memo, useCallback, type RefObject } from 'react';
import { CardTheme } from './card-theme';
import { FullscreenButton } from './fullscreen-button';
import {
  cardBadgeClass,
  cardControlClass,
  cardControlsClass,
  cardDensity
} from './helpers';
import { useFullscreen } from './hooks/use-fullscreen';
import {
  PinnedCardType,
  type TPinnedCard
} from './hooks/use-pin-card-controller';
import { useScreenShareZoom } from './hooks/use-screen-share-zoom';
import { useVoiceRefs } from './hooks/use-voice-refs';
import { PictureInPictureButton } from './picture-in-picture-button';
import { PinButton } from './pin-button';
import { QualityButton } from './quality-button';
import { getStreamQualityMetadataLabel } from './quality-options';
import { VolumeButton } from './volume-button';

type TExternalStreamControlsProps = {
  isPinned: boolean;
  isFullscreen: boolean;
  isZoomEnabled: boolean;
  handlePinToggle: () => void;
  handleToggleFullscreen: () => void;
  handleToggleZoom: () => void;
  showPinControls: boolean;
  hasVideo: boolean;
  hasAudio: boolean;
  showQualityControl: boolean;
  volumeKey: TVolumeKey;
  videoRef: RefObject<HTMLVideoElement | null>;
  streamId: number;
  isCompact: boolean;
};

const ExternalStreamControls = memo(
  ({
    isPinned,
    isFullscreen,
    isZoomEnabled,
    handlePinToggle,
    handleToggleFullscreen,
    handleToggleZoom,
    showPinControls,
    hasVideo,
    hasAudio,
    showQualityControl,
    volumeKey,
    videoRef,
    streamId,
    isCompact
  }: TExternalStreamControlsProps) => {
    const density = cardDensity(isCompact);

    return (
      <div
        className={cn(
          'absolute top-0 right-0 z-10 justify-end',
          density.inset,
          'hidden group-hover/external-stream-card:flex',
          'has-[[data-state=open]]:flex'
        )}
      >
        <div className={cardControlsClass(isCompact)}>
          {hasAudio && (
            <VolumeButton
              volumeKey={volumeKey}
              size={density.icon}
              className={cardControlClass()}
            />
          )}
          {showQualityControl && (
            <QualityButton
              streamId={streamId}
              kind={StreamKind.EXTERNAL_VIDEO}
              size={density.icon}
              className={cardControlClass()}
            />
          )}
          {hasVideo && (
            <PictureInPictureButton
              videoRef={videoRef}
              size={density.icon}
              className={cardControlClass()}
            />
          )}
          {hasVideo && (
            <FullscreenButton
              isFullscreen={isFullscreen}
              handleToggleFullscreen={handleToggleFullscreen}
              size={density.icon}
              className={cardControlClass(isFullscreen)}
            />
          )}
          {showPinControls && hasVideo && isPinned && (
            <IconButton
              variant={isZoomEnabled ? 'default' : 'ghost'}
              icon={isZoomEnabled ? ZoomOut : ZoomIn}
              onClick={handleToggleZoom}
              title={isZoomEnabled ? 'Disable Zoom' : 'Enable Zoom'}
              size={density.icon}
              className={cardControlClass(isZoomEnabled)}
            />
          )}
          {showPinControls && (
            <PinButton
              isPinned={isPinned}
              handlePinToggle={handlePinToggle}
              size={density.icon}
              className={cardControlClass(isPinned)}
            />
          )}
        </div>
      </div>
    );
  }
);

type TExternalStreamCardProps = {
  streamId: number;
  stream: TExternalStream;
  isPinned?: boolean;
  cardId: string;
  onPin: (card: TPinnedCard) => void;
  onUnpin: () => void;
  className?: string;
  showPinControls: boolean;
  isAnyCardPinned?: boolean;
};

const ExternalStreamCard = memo(
  ({
    streamId,
    stream,
    isPinned = false,
    cardId,
    onPin,
    onUnpin,
    className,
    showPinControls = true,
    isAnyCardPinned = false
  }: TExternalStreamCardProps) => {
    const { externalVideoRef, hasExternalVideoStream, hasExternalAudioStream } =
      useVoiceRefs(streamId, stream.pluginId, stream.key);

    const { getVolume, getExternalVolumeKey } = useVolumeControl();

    const showUserBanners = useShowUserBannersInVoice();
    const { getStreamQuality, getStreamQualityLayers, isSimulcastConsumer } =
      useVoice();
    const volumeKey = getExternalVolumeKey(stream.pluginId, stream.key);
    const volume = getVolume(volumeKey);
    const isMuted = volume === 0;

    const isCompact = isAnyCardPinned && !isPinned;
    const density = cardDensity(isCompact);

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
        onPin({
          id: cardId,
          type: PinnedCardType.EXTERNAL_STREAM,
          userId: streamId
        });
      }
    }, [isPinned, onPin, onUnpin, cardId, streamId, resetZoom]);

    const hasVideo = stream.tracks?.video && hasExternalVideoStream;
    const hasAudio = stream.tracks?.audio && hasExternalAudioStream;

    const isSimulcastExternalVideoConsumer = isSimulcastConsumer(
      streamId,
      StreamKind.EXTERNAL_VIDEO
    );

    const qualityLayers = getStreamQualityLayers(
      streamId,
      StreamKind.EXTERNAL_VIDEO
    );

    const streamQuality = getStreamQuality(streamId, StreamKind.EXTERNAL_VIDEO);

    const qualityLabel = isSimulcastExternalVideoConsumer
      ? getStreamQualityMetadataLabel(streamQuality, qualityLayers)
      : null;

    return (
      <div
        ref={containerRef}
        className={cn(
          'relative bg-card',
          'flex items-center justify-center',
          'size-full',
          isFullscreen
            ? 'rounded-none border-none'
            : 'rounded overflow-hidden border border-border',
          (!isFullscreen || isOverlayVisible) && 'group/external-stream-card',
          className
        )}
        onWheel={hasVideo ? handleWheel : undefined}
        onMouseDown={hasVideo ? handleMouseDown : undefined}
        onMouseMove={hasVideo ? handleMouseMove : undefined}
        onMouseUp={hasVideo ? handleMouseUp : undefined}
        onMouseLeave={hasVideo ? handleMouseUp : undefined}
        onDoubleClick={hasVideo ? handleDoubleClick : undefined}
        style={{
          cursor:
            isFullscreen && !isOverlayVisible
              ? 'none'
              : hasVideo
                ? getCursor()
                : 'default'
        }}
      >
        {stream.bannerUrl && showUserBanners ? (
          <div
            className="h-full w-full rounded bg-cover bg-center blur-sm brightness-50 bg-no-repeat absolute inset-0"
            style={{
              backgroundImage: `url("${stream.bannerUrl}")`
            }}
          />
        ) : (
          <CardTheme />
        )}

        <ExternalStreamControls
          isPinned={isPinned}
          isFullscreen={isFullscreen}
          isZoomEnabled={isZoomEnabled}
          handlePinToggle={handlePinToggle}
          handleToggleFullscreen={handleToggleFullscreen}
          handleToggleZoom={handleToggleZoom}
          showPinControls={showPinControls}
          hasVideo={!!hasVideo}
          hasAudio={!!hasAudio}
          showQualityControl={!!hasVideo && isSimulcastExternalVideoConsumer}
          volumeKey={volumeKey}
          videoRef={externalVideoRef}
          streamId={streamId}
          isCompact={isCompact}
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
                  <AvatarFallback className="bg-linear-to-br from-green-500/30 to-emerald-500/30">
                    <Headphones className="size-10 text-green-400" />
                  </AvatarFallback>
                </Avatar>
              ) : (
                <div className="w-20 h-20 rounded-full bg-linear-to-br from-green-500/30 to-emerald-500/30 flex items-center justify-center border-2 border-green-500/50">
                  <Headphones className="size-10 text-green-400" />
                </div>
              )}
              {hasAudio && !isMuted && (
                <div className="absolute inset-0 rounded-full animate-pulse bg-green-500/20" />
              )}
            </div>
          </div>
        )}

        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 z-10',
            density.inset,
            'hidden group-hover/external-stream-card:flex'
          )}
        >
          <div className={cardBadgeClass(isCompact)}>
            {stream.avatarUrl ? (
              <img
                src={stream.avatarUrl}
                alt={stream.title || 'External Stream'}
                className="size-4 shrink-0 rounded-full"
              />
            ) : (
              <Router className="size-3 text-purple-400 shrink-0" />
            )}
            {hasVideo && <Video className="size-3 text-blue-400 shrink-0" />}
            {hasAudio && (
              <Headphones
                className={cn(
                  'size-3 shrink-0',
                  isMuted ? 'text-red-400' : 'text-green-400'
                )}
              />
            )}
            <p className={cn('leading-none truncate', density.label)}>
              {stream.title || 'External Stream'}
              {(qualityLabel || stream.pluginId) && (
                <span className="text-muted-foreground text-xs ml-2 leading-none">
                  {qualityLabel && `(${qualityLabel})`}
                  {qualityLabel && stream.pluginId && ' '}
                  {stream.pluginId && `via ${stream.pluginId}`}
                </span>
              )}
              {isZoomEnabled && zoom > 1 && (
                <span className="text-white/70 text-xs ml-2 leading-none">
                  {Math.round(zoom * 100)}%
                </span>
              )}
            </p>
          </div>
        </div>
      </div>
    );
  }
);

ExternalStreamCard.displayName = 'ExternalStreamCard';

export { ExternalStreamCard };
