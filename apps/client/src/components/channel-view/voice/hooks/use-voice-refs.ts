import { useVolumeControl } from '@/components/voice-provider/volume-control-context';
import { useIsOwnUser } from '@/features/server/users/hooks';
import { useVoice } from '@/features/server/voice/hooks';
import { StreamKind } from '@sharkord/shared';
import { useEffect, useMemo } from 'react';
import { useAudioLevel } from './use-audio-level';

const useVoiceRefs = (
  remoteId: number,
  pluginId?: string,
  streamKey?: string
) => {
  const {
    remoteUserStreams,
    externalStreams,
    localAudioStream,
    localVideoStream,
    localScreenShareStream,
    localScreenShareAudioStream,
    ownVoiceState,
    getOrCreateRefs
  } = useVoice();
  const isOwnUser = useIsOwnUser(remoteId);
  const { getVolume, getUserVolumeKey, getUserScreenVolumeKey, getExternalVolumeKey } =
    useVolumeControl();

  const {
    videoRef,
    audioRef,
    screenShareRef,
    screenShareAudioRef,
    externalAudioRef,
    externalVideoRef
  } = getOrCreateRefs(remoteId);

  const videoStream = useMemo(() => {
    if (isOwnUser) return localVideoStream;

    return remoteUserStreams[remoteId]?.[StreamKind.VIDEO];
  }, [remoteUserStreams, remoteId, isOwnUser, localVideoStream]);

  const audioStream = useMemo(() => {
    if (isOwnUser) return undefined;

    return remoteUserStreams[remoteId]?.[StreamKind.AUDIO];
  }, [remoteUserStreams, remoteId, isOwnUser]);

  const audioStreamForLevel = useMemo(() => {
    if (isOwnUser) return localAudioStream;

    return remoteUserStreams[remoteId]?.[StreamKind.AUDIO];
  }, [remoteUserStreams, remoteId, isOwnUser, localAudioStream]);

  const screenShareStream = useMemo(() => {
    if (isOwnUser) return localScreenShareStream;

    return remoteUserStreams[remoteId]?.[StreamKind.SCREEN];
  }, [remoteUserStreams, remoteId, isOwnUser, localScreenShareStream]);

  const screenShareAudioStream = useMemo(() => {
    if (isOwnUser) return undefined;

    return remoteUserStreams[remoteId]?.[StreamKind.SCREEN_AUDIO];
  }, [remoteUserStreams, remoteId, isOwnUser, localScreenShareAudioStream]);

  const externalAudioStream = useMemo(() => {
    if (isOwnUser) return undefined;

    const external = externalStreams[remoteId];

    return external?.audioStream;
  }, [externalStreams, remoteId, isOwnUser]);

  const externalVideoStream = useMemo(() => {
    if (isOwnUser) return undefined;

    const external = externalStreams[remoteId];

    return external?.videoStream;
  }, [externalStreams, remoteId, isOwnUser]);

  const { audioLevel, isSpeaking, speakingIntensity } =
    useAudioLevel(audioStreamForLevel);

  const userVolumeKey = getUserVolumeKey(remoteId);
  const userVolume = getVolume(userVolumeKey);

  const userScreenVolumeKey = getUserScreenVolumeKey(remoteId);
  const userScreenVolume = getVolume(userScreenVolumeKey);

  const externalVolumeKey =
    pluginId && streamKey ? getExternalVolumeKey(pluginId, streamKey) : null;

  const externalVolume = externalVolumeKey ? getVolume(externalVolumeKey) : 100;

  useEffect(() => {
    if (!videoStream || !videoRef.current) return;

    videoRef.current.srcObject = videoStream;
  }, [videoStream, videoRef]);

  useEffect(() => {
    if (!audioStream || !audioRef.current) return;

    if (audioRef.current.srcObject !== audioStream) {
      audioRef.current.srcObject = audioStream;
    }

    audioRef.current.volume = userVolume / 100;
  }, [audioStream, audioRef, userVolume]);

  useEffect(() => {
    if (!screenShareAudioStream || !screenShareAudioRef.current) return;

    if (screenShareAudioRef.current.srcObject !== screenShareAudioStream) {
      screenShareAudioRef.current.srcObject = screenShareAudioStream;
    }

    screenShareAudioRef.current.volume = userScreenVolume / 100;
  }, [screenShareAudioStream, screenShareAudioRef, userScreenVolume]);

  useEffect(() => {
    if (!screenShareStream || !screenShareRef.current) return;

    if (screenShareRef.current.srcObject !== screenShareStream) {
      screenShareRef.current.srcObject = screenShareStream;
    }
  }, [screenShareStream, screenShareRef]);

  useEffect(() => {
    if (!externalAudioStream || !externalAudioRef.current) return;

    if (externalAudioRef.current.srcObject !== externalAudioStream) {
      externalAudioRef.current.srcObject = externalAudioStream;
    }

    externalAudioRef.current.volume = externalVolume / 100;
  }, [externalAudioStream, externalAudioRef, externalVolume]);

  useEffect(() => {
    if (!externalVideoStream || !externalVideoRef.current) return;

    if (externalVideoRef.current.srcObject !== externalVideoStream) {
      externalVideoRef.current.srcObject = externalVideoStream;
    }
  }, [externalVideoStream, externalVideoRef]);

  useEffect(() => {
    if (!audioRef.current) return;

    audioRef.current.muted = ownVoiceState.soundMuted;
  }, [ownVoiceState.soundMuted, audioRef]);

  return {
    videoRef,
    audioRef,
    screenShareRef,
    screenShareAudioRef,
    externalAudioRef,
    externalVideoRef,
    hasAudioStream: !!audioStream,
    hasVideoStream: !!videoStream,
    hasScreenShareStream: !!screenShareStream,
    hasScreenShareAudioStream: !!screenShareAudioStream,
    hasExternalAudioStream: !!externalAudioStream,
    hasExternalVideoStream: !!externalVideoStream,
    audioLevel,
    isSpeaking,
    speakingIntensity
  };
};

export { useVoiceRefs };
