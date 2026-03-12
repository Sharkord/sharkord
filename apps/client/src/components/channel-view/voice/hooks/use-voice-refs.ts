import { useDevices } from '@/components/devices-provider/hooks/use-devices';
import { useVolumeControl } from '@/components/voice-provider/volume-control-context';
import { useIsOwnUser } from '@/features/server/users/hooks';
import { useVoice } from '@/features/server/voice/hooks';
import { applyAudioOutputDevice } from '@/helpers/audio-output';
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
    ownVoiceState,
    getOrCreateRefs
  } = useVoice();
  const isOwnUser = useIsOwnUser(remoteId);
  const {
    getVolume,
    getUserVolumeKey,
    getUserScreenVolumeKey,
    getExternalVolumeKey
  } = useVolumeControl();
  const { devices } = useDevices();

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
    if (!ownVoiceState.videoStreamsEnabled) return undefined;

    return remoteUserStreams[remoteId]?.[StreamKind.VIDEO];
  }, [
    remoteUserStreams,
    remoteId,
    isOwnUser,
    localVideoStream,
    ownVoiceState.videoStreamsEnabled
  ]);

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
    if (!ownVoiceState.videoStreamsEnabled) return undefined;

    return remoteUserStreams[remoteId]?.[StreamKind.SCREEN];
  }, [
    remoteUserStreams,
    remoteId,
    isOwnUser,
    localScreenShareStream,
    ownVoiceState.videoStreamsEnabled
  ]);

  const screenShareAudioStream = useMemo(() => {
    if (isOwnUser) return undefined;

    return remoteUserStreams[remoteId]?.[StreamKind.SCREEN_AUDIO];
  }, [remoteUserStreams, remoteId, isOwnUser]);

  const externalAudioStream = useMemo(() => {
    if (isOwnUser) return undefined;

    const external = externalStreams[remoteId];

    return external?.audioStream;
  }, [externalStreams, remoteId, isOwnUser]);

  const externalVideoStream = useMemo(() => {
    if (isOwnUser) return undefined;
    if (!ownVoiceState.videoStreamsEnabled) return undefined;

    const external = externalStreams[remoteId];

    return external?.videoStream;
  }, [externalStreams, remoteId, isOwnUser, ownVoiceState.videoStreamsEnabled]);

  const { audioLevel, isSpeaking, speakingIntensity, speakingEffectClass } =
    useAudioLevel(audioStreamForLevel);

  const userVolumeKey = getUserVolumeKey(remoteId);
  const userVolume = getVolume(userVolumeKey);

  const userScreenVolumeKey = getUserScreenVolumeKey(remoteId);
  const userScreenVolume = getVolume(userScreenVolumeKey);

  const externalVolumeKey =
    pluginId && streamKey ? getExternalVolumeKey(pluginId, streamKey) : null;

  const externalVolume = externalVolumeKey ? getVolume(externalVolumeKey) : 100;

  useEffect(() => {
    if (!videoRef.current) return;

    videoRef.current.srcObject = videoStream ?? null;
  }, [videoStream, videoRef]);

  useEffect(() => {
    if (!audioStream || !audioRef.current) return;

    if (audioRef.current.srcObject !== audioStream) {
      audioRef.current.srcObject = audioStream;
    }

    audioRef.current.volume = userVolume / 100;
    audioRef.current.muted = ownVoiceState.soundMuted;

    applyAudioOutputDevice(audioRef.current, devices.playbackId);
  }, [
    audioStream,
    audioRef,
    userVolume,
    devices.playbackId,
    ownVoiceState.soundMuted
  ]);

  useEffect(() => {
    if (!screenShareAudioStream || !screenShareAudioRef.current) return;

    if (screenShareAudioRef.current.srcObject !== screenShareAudioStream) {
      screenShareAudioRef.current.srcObject = screenShareAudioStream;
    }

    screenShareAudioRef.current.volume = userScreenVolume / 100;
    screenShareAudioRef.current.muted = ownVoiceState.soundMuted;

    applyAudioOutputDevice(screenShareAudioRef.current, devices.playbackId);
  }, [
    screenShareAudioStream,
    screenShareAudioRef,
    userScreenVolume,
    devices.playbackId,
    ownVoiceState.soundMuted
  ]);

  useEffect(() => {
    if (!screenShareRef.current) return;

    if (screenShareRef.current.srcObject !== (screenShareStream ?? null)) {
      screenShareRef.current.srcObject = screenShareStream ?? null;
    }
  }, [screenShareStream, screenShareRef]);

  useEffect(() => {
    if (!externalAudioStream || !externalAudioRef.current) return;

    if (externalAudioRef.current.srcObject !== externalAudioStream) {
      externalAudioRef.current.srcObject = externalAudioStream;
    }

    externalAudioRef.current.volume = externalVolume / 100;
    externalAudioRef.current.muted = ownVoiceState.soundMuted;

    applyAudioOutputDevice(externalAudioRef.current, devices.playbackId);
  }, [
    externalAudioStream,
    externalAudioRef,
    externalVolume,
    devices.playbackId,
    ownVoiceState.soundMuted
  ]);

  useEffect(() => {
    if (!externalVideoRef.current) return;

    if (externalVideoRef.current.srcObject !== (externalVideoStream ?? null)) {
      externalVideoRef.current.srcObject = externalVideoStream ?? null;
    }
  }, [externalVideoStream, externalVideoRef]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = ownVoiceState.soundMuted;
    }

    if (screenShareAudioRef.current) {
      screenShareAudioRef.current.muted = ownVoiceState.soundMuted;
    }

    if (externalAudioRef.current) {
      externalAudioRef.current.muted = ownVoiceState.soundMuted;
    }
  }, [
    ownVoiceState.soundMuted,
    audioRef,
    screenShareAudioRef,
    externalAudioRef,
    audioStream,
    screenShareAudioStream,
    externalAudioStream
  ]);

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
    speakingIntensity,
    speakingEffectClass
  };
};

export { useVoiceRefs };
