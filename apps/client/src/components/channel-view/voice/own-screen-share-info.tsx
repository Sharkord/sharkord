import { useVoiceStats } from '@/components/voice-provider/stats-context';
import { memo, type RefObject } from 'react';
import { StreamInfo } from './stream-info';

type TOwnScreenShareInfoProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  qualityLabel: string | null | undefined;
};

const OwnScreenShareInfo = memo(
  ({ videoRef, qualityLabel }: TOwnScreenShareInfoProps) => {
    const { screenShare } = useVoiceStats();

    return (
      <StreamInfo
        videoRef={videoRef}
        mimeType={screenShare?.codec}
        qualityLabel={qualityLabel}
      />
    );
  }
);

export { OwnScreenShareInfo };
