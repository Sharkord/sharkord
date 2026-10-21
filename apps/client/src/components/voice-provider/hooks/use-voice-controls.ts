import { usePushToTalkActive } from '@/features/app/hooks';
import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { useChannelCan } from '@/features/server/hooks';
import { SoundType } from '@/features/server/types';
import { updateOwnVoiceState } from '@/features/server/voice/actions';
import { useOwnVoiceState } from '@/features/server/voice/hooks';
import { voiceLogger } from '@/helpers/browser-logger';
import { playSound } from '@/helpers/sounds';
import { getTRPCClient } from '@/lib/trpc';
import { ChannelPermission, getTrpcError } from '@sharkord/shared';
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

type TPendingMicRestoreState = {
  previousMicMuted: boolean;
  shouldRestoreOnUndeafen: boolean;
};

type TVoiceStateUpdate = {
  micMuted?: boolean;
  soundMuted?: boolean;
  webcamEnabled?: boolean;
  sharingScreen?: boolean;
};

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
  const { t } = useTranslation('common');
  const ownVoiceState = useOwnVoiceState();
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const isPushToTalk = usePushToTalkActive();
  const channelCan = useChannelCan(currentVoiceChannelId);
  const canUseWebcam = channelCan(ChannelPermission.WEBCAM);

  const isTogglingMic = useRef(false);
  const isTogglingSound = useRef(false);
  const isTogglingWebcam = useRef(false);
  const isTogglingScreenShare = useRef(false);
  const pendingMicRestoreStateRef = useRef<TPendingMicRestoreState | null>(
    null
  );

  const toggleMic = useCallback(async () => {
    if (isTogglingMic.current) return;
    const nextMicMuted = !ownVoiceState.micMuted;

    if (ownVoiceState.soundMuted && !nextMicMuted) {
      return;
    }

    if (ownVoiceState.serverMuted && !nextMicMuted) {
      toast.error(t('mutedByModerator'));

      return;
    }

    isTogglingMic.current = true;

    voiceLogger.info('mic: toggle requested', { micMuted: nextMicMuted });

    const previousPendingMicRestoreState = pendingMicRestoreStateRef.current;

    if (ownVoiceState.soundMuted) {
      pendingMicRestoreStateRef.current = null;
    }

    updateOwnVoiceState({ micMuted: nextMicMuted });

    if (!isPushToTalk) {
      playSound(
        nextMicMuted
          ? SoundType.OWN_USER_MUTED_MIC
          : SoundType.OWN_USER_UNMUTED_MIC
      );
    }

    if (!currentVoiceChannelId) {
      isTogglingMic.current = false;
      return;
    }

    const trpc = getTRPCClient();

    try {
      await trpc.voice.updateState.mutate({
        micMuted: nextMicMuted
      });

      if (!localAudioStream && !nextMicMuted) {
        await startMicStream();
      }
    } catch (error) {
      pendingMicRestoreStateRef.current = previousPendingMicRestoreState;

      updateOwnVoiceState({ micMuted: !nextMicMuted });
      voiceLogger.error('mic: toggle failed, rolled back', error, {
        micMuted: nextMicMuted
      });
      toast.error(getTrpcError(error, t('common:failedUpdateMicrophoneState')));
    } finally {
      isTogglingMic.current = false;
    }
  }, [
    t,
    ownVoiceState.micMuted,
    ownVoiceState.soundMuted,
    ownVoiceState.serverMuted,
    startMicStream,
    currentVoiceChannelId,
    localAudioStream,
    isPushToTalk
  ]);

  const toggleSound = useCallback(async () => {
    if (isTogglingSound.current) return;
    isTogglingSound.current = true;

    const nextSoundMuted = !ownVoiceState.soundMuted;
    const trpc = getTRPCClient();

    voiceLogger.info('sound: toggle requested', { soundMuted: nextSoundMuted });
    const previousPendingMicRestoreState = pendingMicRestoreStateRef.current;
    const nextVoiceState: TVoiceStateUpdate = {
      soundMuted: nextSoundMuted
    };

    if (nextSoundMuted) {
      const shouldRestoreOnUndeafen = !ownVoiceState.micMuted;

      pendingMicRestoreStateRef.current = {
        previousMicMuted: ownVoiceState.micMuted,
        shouldRestoreOnUndeafen
      };

      if (shouldRestoreOnUndeafen) {
        nextVoiceState.micMuted = true;
      }
    } else {
      const pendingMicRestoreState = pendingMicRestoreStateRef.current;

      if (
        pendingMicRestoreState?.shouldRestoreOnUndeafen &&
        !ownVoiceState.serverMuted
      ) {
        nextVoiceState.micMuted = pendingMicRestoreState.previousMicMuted;
      }

      pendingMicRestoreStateRef.current = null;
    }

    const rollbackVoiceState: TVoiceStateUpdate = {
      soundMuted: ownVoiceState.soundMuted
    };

    if (nextVoiceState.micMuted !== undefined) {
      rollbackVoiceState.micMuted = ownVoiceState.micMuted;
    }

    updateOwnVoiceState(nextVoiceState);
    playSound(
      nextSoundMuted
        ? SoundType.OWN_USER_MUTED_SOUND
        : SoundType.OWN_USER_UNMUTED_SOUND
    );

    if (!currentVoiceChannelId) {
      isTogglingSound.current = false;
      return;
    }

    try {
      await trpc.voice.updateState.mutate(nextVoiceState);

      if (!localAudioStream && nextVoiceState.micMuted === false) {
        await startMicStream();
      }
    } catch (error) {
      pendingMicRestoreStateRef.current = previousPendingMicRestoreState;
      updateOwnVoiceState(rollbackVoiceState);
      voiceLogger.error('sound: toggle failed, rolled back', error, {
        soundMuted: nextSoundMuted
      });
      toast.error(getTrpcError(error, t('common:failedUpdateSoundState')));
    } finally {
      isTogglingSound.current = false;
    }
  }, [
    t,
    ownVoiceState.soundMuted,
    ownVoiceState.micMuted,
    ownVoiceState.serverMuted,
    currentVoiceChannelId,
    localAudioStream,
    startMicStream
  ]);

  const toggleWebcam = useCallback(async () => {
    if (!currentVoiceChannelId) return;
    if (isTogglingWebcam.current) return;
    isTogglingWebcam.current = true;

    const newState = !ownVoiceState.webcamEnabled;

    voiceLogger.info('webcam: toggle requested', { enabled: newState });

    updateOwnVoiceState({ webcamEnabled: newState });

    playSound(
      newState
        ? SoundType.OWN_USER_STARTED_WEBCAM
        : SoundType.OWN_USER_STOPPED_WEBCAM
    );

    try {
      const trpc = getTRPCClient();

      if (newState) {
        await startWebcamStream();
      } else {
        stopWebcamStream();
      }

      await trpc.voice.updateState.mutate({
        webcamEnabled: newState
      });
    } catch (error) {
      // a start that failed after the device was opened leaves the camera publishing,
      // so release the capture before rolling the state back
      if (newState) {
        stopWebcamStream();
      }

      updateOwnVoiceState({ webcamEnabled: false });

      try {
        const trpc = getTRPCClient();

        await trpc.voice.updateState.mutate({ webcamEnabled: false });
      } catch {
        // ignore
      }

      voiceLogger.error('webcam: toggle failed, rolled back', error, {
        enabled: newState
      });
      toast.error(getTrpcError(error, t('common:failedUpdateWebcamState')));
    } finally {
      isTogglingWebcam.current = false;
    }
  }, [
    t,
    ownVoiceState.webcamEnabled,
    currentVoiceChannelId,
    startWebcamStream,
    stopWebcamStream
  ]);

  // a revoked permission never reaches the runtime on its own, so a camera that is
  // already publishing has to be stopped from this side when the channel loses WEBCAM
  useEffect(() => {
    if (canUseWebcam) return;
    if (!ownVoiceState.webcamEnabled) return;

    voiceLogger.info('webcam: channel permission revoked, stopping');

    toggleWebcam().catch((error) => {
      voiceLogger.error('webcam: failed to stop after permission was revoked', {
        error
      });
    });
  }, [canUseWebcam, ownVoiceState.webcamEnabled, toggleWebcam]);

  const toggleScreenShare = useCallback(async () => {
    if (isTogglingScreenShare.current) return;
    isTogglingScreenShare.current = true;

    const newState = !ownVoiceState.sharingScreen;
    const trpc = getTRPCClient();

    voiceLogger.info('screen: toggle requested', { sharing: newState });

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
      // the capture keeps running if the start failed after the user picked a source
      if (newState) {
        stopScreenShareStream();
      }

      updateOwnVoiceState({ sharingScreen: false });

      try {
        await trpc.voice.updateState.mutate({ sharingScreen: false });
      } catch {
        // ignore
      }

      voiceLogger.error('screen: toggle failed, rolled back', error, {
        sharing: newState
      });
      toast.error(
        getTrpcError(error, t('common:failedUpdateScreenShareState'))
      );
    } finally {
      isTogglingScreenShare.current = false;
    }
  }, [
    t,
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
