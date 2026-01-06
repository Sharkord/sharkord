import { useVoiceUsersByChannelId } from '@/features/server/hooks';
import { memo } from 'react';
import { useVoiceRefs } from './hooks/use-voice-refs';

type TVoiceUserAudioStreamProps = {
  userId: number;
};

const VoiceUserAudioStream = memo(({ userId }: TVoiceUserAudioStreamProps) => {
  const { audioRef, hasAudioStream } = useVoiceRefs(userId);

  return (
    <>
      {hasAudioStream && <audio ref={audioRef} className="hidden" autoPlay />}
    </>
  );
});

type TVoiceAudioStreamsProps = {
  channelId: number;
};

const VoiceAudioStreams = memo(({ channelId }: TVoiceAudioStreamsProps) => {
  const voiceUsers = useVoiceUsersByChannelId(channelId);

  return (
    <>
      {voiceUsers.map((voiceUser) => (
        <VoiceUserAudioStream key={voiceUser.id} userId={voiceUser.id} />
      ))}
    </>
  );
});

export { VoiceAudioStreams };
