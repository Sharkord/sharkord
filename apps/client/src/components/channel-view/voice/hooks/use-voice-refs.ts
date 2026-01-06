import { useIsOwnUser } from '@/features/server/users/hooks';
import { useVoice } from '@/features/server/voice/hooks';
import { StreamKind } from '@sharkord/shared';
import { useEffect, useMemo, useRef } from 'react';
import { useAudioLevel } from './use-audio-level';

const useVoiceRefs = (userId: number) => {
  const {
    remoteStreams,
    localAudioStream,
    localVideoStream,
    localScreenShareStream,
    ownVoiceState
  } = useVoice();
  const isOwnUser = useIsOwnUser(userId);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);

  const videoStream = useMemo(() => {
    if (isOwnUser) return localVideoStream;

    return remoteStreams[userId]?.[StreamKind.VIDEO];
  }, [remoteStreams, userId, isOwnUser, localVideoStream]);

  const audioStream = useMemo(() => {
    if (isOwnUser) return undefined;

    return remoteStreams[userId]?.[StreamKind.AUDIO];
  }, [remoteStreams, userId, isOwnUser]);

  const audioStreamForLevel = useMemo(() => {
    if (isOwnUser) return localAudioStream;

    return remoteStreams[userId]?.[StreamKind.AUDIO];
  }, [remoteStreams, userId, isOwnUser, localAudioStream]);

  const screenShareStream = useMemo(() => {
    if (isOwnUser) return localScreenShareStream;

    return remoteStreams[userId]?.[StreamKind.SCREEN];
  }, [remoteStreams, userId, isOwnUser, localScreenShareStream]);

  const { audioLevel, isSpeaking, speakingIntensity } =
    useAudioLevel(audioStreamForLevel);

  useEffect(() => {
    if (!videoStream || !videoRef.current) return;

    videoRef.current.srcObject = videoStream;
  }, [videoStream]);

  useEffect(() => {
    if (!audioStream || !audioRef.current) return;

    audioRef.current.srcObject = audioStream;
  }, [audioStream]);

  useEffect(() => {
    if (!screenShareStream || !screenShareRef.current) return;

    screenShareRef.current.srcObject = screenShareStream;
  }, [screenShareStream]);

  useEffect(() => {
    if (!audioRef.current) return;

    audioRef.current.muted = ownVoiceState.soundMuted;
  }, [ownVoiceState.soundMuted]);

  return {
    videoRef,
    audioRef,
    screenShareRef,
    hasAudioStream: !!audioStream,
    hasVideoStream: !!videoStream,
    hasScreenShareStream: !!screenShareStream,
    audioLevel,
    isSpeaking,
    speakingIntensity
  };
};

export { useVoiceRefs };
