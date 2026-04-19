import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { playSound } from '@/features/server/sounds/actions';
import { SoundType } from '@/features/server/types';
import { updateOwnVoiceState } from '@/features/server/voice/actions';
import { useOwnVoiceState } from '@/features/server/voice/hooks';
import { getTRPCClient } from '@/lib/trpc';
import { getTrpcError } from '@sharkord/shared';
import { useCallback, useRef } from 'react';
import { toast } from 'sonner';

type TUseVoiceControlsParams = {
  startMicStream: () => Promise<void>;
  localAudioStream: MediaStream | undefined;

  startWebcamStream: () => Promise<void>;
  stopWebcamStream: () => void;

  startScreenShareStream: () => Promise<MediaStreamTrack>;
  stopScreenShareStream: () => void;
};

const useVoiceControls = ({
  startMicStream,
  localAudioStream,
  startWebcamStream,
  stopWebcamStream,
  startScreenShareStream,
  stopScreenShareStream
}: TUseVoiceControlsParams) => {
  const ownVoiceState = useOwnVoiceState();
  const currentVoiceChannelId = useCurrentVoiceChannelId();

  const isTogglingMic = useRef(false);
  const isTogglingSound = useRef(false);
  const isTogglingWebcam = useRef(false);
  const isTogglingScreenShare = useRef(false);

  const toggleMic = useCallback(async () => {
    if (isTogglingMic.current) return;
    isTogglingMic.current = true;
    const newState = !ownVoiceState.micMuted;
    const trpc = getTRPCClient();

    updateOwnVoiceState({ micMuted: newState });
    playSound(
      newState ? SoundType.OWN_USER_MUTED_MIC : SoundType.OWN_USER_UNMUTED_MIC
    );

    if (!currentVoiceChannelId) {
      isTogglingMic.current = false;
      return;
    }

    try {
      await trpc.voice.updateState.mutate({
        micMuted: newState
      });

      if (!localAudioStream && !newState) {
        await startMicStream();
      }
    } catch (error) {
      updateOwnVoiceState({ micMuted: !newState });
      toast.error(getTrpcError(error, 'Failed to update microphone state'));
    } finally {
      isTogglingMic.current = false;
    }
  }, [
    ownVoiceState.micMuted,
    startMicStream,
    currentVoiceChannelId,
    localAudioStream
  ]);

  const toggleSound = useCallback(async () => {
    if (isTogglingSound.current) return;
    isTogglingSound.current = true;

    const newState = !ownVoiceState.soundMuted;
    const trpc = getTRPCClient();

    updateOwnVoiceState({ soundMuted: newState });
    playSound(
      newState
        ? SoundType.OWN_USER_MUTED_SOUND
        : SoundType.OWN_USER_UNMUTED_SOUND
    );

    if (!currentVoiceChannelId) {
      isTogglingSound.current = false;
      return;
    }

    try {
      await trpc.voice.updateState.mutate({
        soundMuted: newState
      });
    } catch (error) {
      toast.error(getTrpcError(error, 'Failed to update sound state'));
    } finally {
      isTogglingSound.current = false;
    }
  }, [ownVoiceState.soundMuted, currentVoiceChannelId]);

  const toggleWebcam = useCallback(async () => {
    if (!currentVoiceChannelId) return;
    if (isTogglingWebcam.current) return;
    isTogglingWebcam.current = true;

    const newState = !ownVoiceState.webcamEnabled;
    const trpc = getTRPCClient();

    updateOwnVoiceState({ webcamEnabled: newState });

    playSound(
      newState
        ? SoundType.OWN_USER_STARTED_WEBCAM
        : SoundType.OWN_USER_STOPPED_WEBCAM
    );

    try {
      if (newState) {
        await startWebcamStream();
      } else {
        stopWebcamStream();
      }

      await trpc.voice.updateState.mutate({
        webcamEnabled: newState
      });
    } catch (error) {
      updateOwnVoiceState({ webcamEnabled: false });

      try {
        await trpc.voice.updateState.mutate({ webcamEnabled: false });
      } catch {
        // ignore
      }

      toast.error(getTrpcError(error, 'Failed to update webcam state'));
    } finally {
      isTogglingWebcam.current = false;
    }
  }, [
    ownVoiceState.webcamEnabled,
    currentVoiceChannelId,
    startWebcamStream,
    stopWebcamStream
  ]);

  const toggleScreenShare = useCallback(async () => {
    if (isTogglingScreenShare.current) return;
    isTogglingScreenShare.current = true;

    const newState = !ownVoiceState.sharingScreen;
    const trpc = getTRPCClient();

    updateOwnVoiceState({ sharingScreen: newState });

    playSound(
      newState
        ? SoundType.OWN_USER_STARTED_SCREENSHARE
        : SoundType.OWN_USER_STOPPED_SCREENSHARE
    );

    try {
      if (newState) {
        const video = await startScreenShareStream();

        // handle native screen share end
        video.onended = async () => {
          stopScreenShareStream();
          updateOwnVoiceState({ sharingScreen: false });

          try {
            await trpc.voice.updateState.mutate({
              sharingScreen: false
            });
          } catch {
            // ignore
          }
        };
      } else {
        stopScreenShareStream();
      }

      await trpc.voice.updateState.mutate({
        sharingScreen: newState
      });
    } catch (error) {
      updateOwnVoiceState({ sharingScreen: false });

      try {
        await trpc.voice.updateState.mutate({ sharingScreen: false });
      } catch {
        // ignore
      }

      toast.error(getTrpcError(error, 'Failed to update screen share state'));
    } finally {
      isTogglingScreenShare.current = false;
    }
  }, [
    ownVoiceState.sharingScreen,
    startScreenShareStream,
    stopScreenShareStream
  ]);

  return {
    toggleMic,
    toggleSound,
    toggleWebcam,
    toggleScreenShare
  };
};

export { useVoiceControls };
