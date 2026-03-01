import { useVoiceChannelExternalStreamsList } from '@/features/server/voice/hooks';
import { memo } from 'react';
import { useVoiceRefs } from './hooks/use-voice-refs';

type TExternalAudioStreamProps = {
  streamId: number;
  sourceId: string;
  streamKey: string;
};

const ExternalAudioStream = memo(
  ({ streamId, sourceId, streamKey }: TExternalAudioStreamProps) => {
    const { externalAudioRef, hasExternalAudioStream } = useVoiceRefs(
      streamId,
      sourceId,
      streamKey
    );

    return (
      <>
        {hasExternalAudioStream && (
          <audio
            ref={externalAudioRef}
            className="hidden"
            autoPlay
            data-stream-id={streamId}
          />
        )}
      </>
    );
  }
);

type TExternalAudioStreamsProps = {
  channelId: number;
};

const ExternalAudioStreams = memo(
  ({ channelId }: TExternalAudioStreamsProps) => {
    const externalStreams = useVoiceChannelExternalStreamsList(channelId);

    return externalStreams.map((stream) => (
      <ExternalAudioStream
        key={stream.streamId}
        streamId={stream.streamId}
        sourceId={stream.sourceId}
        streamKey={stream.key}
      />
    ));
  }
);

export { ExternalAudioStreams };
