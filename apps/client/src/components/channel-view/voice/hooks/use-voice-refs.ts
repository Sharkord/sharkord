import { useIsOwnUser } from '@/features/server/users/hooks';
import { useVoice } from '@/features/server/voice/hooks';
import { StreamKind } from '@sharkord/shared';
import { useEffect, useMemo, useRef } from 'react';
import { useAudioLevel } from './use-audio-level';

const useVoiceRefs = (userId: number) => {
  const {
    remoteUserStreams,
    externalStreams,
    localAudioStream,
    localVideoStream,
    localScreenShareStream,
    ownVoiceState
  } = useVoice();
  const isOwnUser = useIsOwnUser(userId);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const screenShareRef = useRef<HTMLVideoElement>(null);
  const externalAudioRef = useRef<HTMLAudioElement>(null);
  const externalVideoRef = useRef<HTMLVideoElement>(null);

  const videoStream = useMemo(() => {
    if (isOwnUser) return localVideoStream;

    return remoteUserStreams[userId]?.[StreamKind.VIDEO];
  }, [remoteUserStreams, userId, isOwnUser, localVideoStream]);

  const audioStream = useMemo(() => {
    if (isOwnUser) return undefined;

    return remoteUserStreams[userId]?.[StreamKind.AUDIO];
  }, [remoteUserStreams, userId, isOwnUser]);

  const audioStreamForLevel = useMemo(() => {
    if (isOwnUser) return localAudioStream;

    return remoteUserStreams[userId]?.[StreamKind.AUDIO];
  }, [remoteUserStreams, userId, isOwnUser, localAudioStream]);

  const screenShareStream = useMemo(() => {
    if (isOwnUser) return localScreenShareStream;

    return remoteUserStreams[userId]?.[StreamKind.SCREEN];
  }, [remoteUserStreams, userId, isOwnUser, localScreenShareStream]);

  const externalAudioStream = useMemo(() => {
    if (isOwnUser) return undefined;

    return externalStreams[userId];
  }, [externalStreams, userId, isOwnUser]);

  const externalVideoStream = useMemo(() => {
    if (isOwnUser) return undefined;

    return externalStreams[userId];
  }, [externalStreams, userId, isOwnUser]);

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

  useEffect(() => {
    if (!externalAudioStream || !externalAudioRef.current) return;

    externalAudioRef.current.srcObject = externalAudioStream;
  }, [externalAudioStream]);

  useEffect(() => {
    if (!externalVideoStream || !externalVideoRef.current) return;

    externalVideoRef.current.srcObject = externalVideoStream;
  }, [externalVideoStream]);

  return {
    videoRef,
    audioRef,
    screenShareRef,
    externalAudioRef,
    externalVideoRef,
    hasAudioStream: !!audioStream,
    hasVideoStream: !!videoStream,
    hasScreenShareStream: !!screenShareStream,
    hasExternalAudioStream: !!externalAudioStream,
    hasExternalVideoStream: !!externalVideoStream,
    audioLevel,
    isSpeaking,
    speakingIntensity
  };
};

export { useVoiceRefs };
