import { setSelectedChannelId } from '@/features/server/channels/actions';
import {
  useCurrentVoiceChannelId,
  useIsCurrentVoiceChannelSelected
} from '@/features/server/channels/hooks';
import { useOwnUserId, useUserById } from '@/features/server/users/hooks';
import { usePinnedCard } from '@/features/server/voice/hooks';
import type { TRemoteStreams } from '@/types';
import { ArrowDownLeft, SendToBack, X } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CardControls } from '../channel-view/voice/card-controls';
import { PinnedCardType } from '../channel-view/voice/hooks/use-pin-card-controller';
import { IconButton } from '@sharkord/ui';
import { useFloatingCard } from './hooks/use-floating-card';
import type { TExternalStreamsMap } from './hooks/use-remote-streams';

type TFloatingPinnedCardProps = {
  remoteUserStreams: TRemoteStreams;
  externalStreams: TExternalStreamsMap;
  localVideoStream: MediaStream | undefined;
  localScreenShareStream: MediaStream | undefined;
};

const FloatingPinnedCard = memo(
  ({
    remoteUserStreams,
    externalStreams,
    localVideoStream,
    localScreenShareStream
  }: TFloatingPinnedCardProps) => {
    const { cardRef, handleMouseDown, getStyle, resetCard } = useFloatingCard();
    const videoRef = useRef<HTMLVideoElement>(null);
    const [open, setOpen] = useState(true);
    const pinnedCard = usePinnedCard();
    const ownUserId = useOwnUserId();
    const currentVoiceChannelSelected = useCurrentVoiceChannelId();
    const isCurrentVoiceChannelSelected = useIsCurrentVoiceChannelSelected();
    const pinnedUser = useUserById(pinnedCard?.userId || -1);

    const isExternalStream =
      pinnedCard?.type === PinnedCardType.EXTERNAL_STREAM;

    const pinnedCardVideoStream = useMemo(() => {
      if (!pinnedCard) return undefined;

      if (isExternalStream) {
        const externalStream = externalStreams[pinnedCard.userId];

        return externalStream?.videoStream;
      }

      if (pinnedCard.userId === ownUserId) {
        return localScreenShareStream || localVideoStream || undefined;
      }

      const streamInfo = remoteUserStreams[pinnedCard.userId];

      if (!streamInfo) return undefined;

      return streamInfo.screen || streamInfo.video || undefined;
    }, [
      pinnedCard,
      remoteUserStreams,
      externalStreams,
      ownUserId,
      localVideoStream,
      localScreenShareStream,
      isExternalStream
    ]);

    const onCloseClick = useCallback(() => {
      setOpen(false);
    }, []);

    const onGoToVoiceChannelClick = useCallback(() => {
      setSelectedChannelId(currentVoiceChannelSelected);
    }, [currentVoiceChannelSelected]);

    useEffect(() => {
      if (videoRef.current && pinnedCardVideoStream) {
        videoRef.current.srcObject = pinnedCardVideoStream;
      }
    }, [pinnedCardVideoStream, isCurrentVoiceChannelSelected]);

    useEffect(() => {
      setOpen(true);
    }, [pinnedCard?.id, isCurrentVoiceChannelSelected]);

    if (!pinnedCardVideoStream || isCurrentVoiceChannelSelected || !open) {
      return null;
    }

    return (
      <div
        ref={cardRef}
        onMouseDown={handleMouseDown}
        className="absolute z-50 cursor-move select-none w-96 aspect-video rounded-lg overflow-hidden border border-border bg-black shadow-lg group"
        style={getStyle()}
      >
        <CardControls>
          <IconButton
            icon={ArrowDownLeft}
            size="sm"
            variant="ghost"
            title="Go To Voice Channel"
            onClick={onGoToVoiceChannelClick}
          />
          <IconButton
            icon={SendToBack}
            size="sm"
            variant="ghost"
            title="Reset Position"
            onClick={resetCard}
          />
          <IconButton
            icon={X}
            size="sm"
            variant="ghost"
            title="Close"
            onClick={onCloseClick}
          />
        </CardControls>

        {pinnedUser && (
          <div className="absolute bottom-2 left-2 bg-black/50 rounded-md px-2 py-1 text-xs z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            {pinnedUser.name}
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="w-full h-full object-contain"
        />
      </div>
    );
  }
);

FloatingPinnedCard.displayName = 'FloatingPinnedCard';

export { FloatingPinnedCard };
