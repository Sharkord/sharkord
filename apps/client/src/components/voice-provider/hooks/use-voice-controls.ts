import { Dialog } from '@/components/dialogs/dialogs';
import { openDialog } from '@/features/dialogs/actions';
import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { SoundType } from '@/features/server/types';
import { updateOwnVoiceState } from '@/features/server/voice/actions';
import { useOwnVoiceState } from '@/features/server/voice/hooks';
import { logVoice, logVoiceError } from '@/helpers/browser-logger';
import { getScreenShareTransport } from '@/helpers/screen-share-transport';
import { playSound } from '@/helpers/sounds';
import { getTRPCClient } from '@/lib/trpc';
import type { TScreenShareTransport } from '@/types';
import { getTrpcError } from '@sharkord/shared';
import { useCallback, useRef } from 'react';
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

  startScreenShareStream: (
    transport: TScreenShareTransport
  ) => Promise<MediaStreamTrack>;
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

    isTogglingMic.current = true;

    logVoice('mic: toggle requested', { micMuted: nextMicMuted });

    const previousPendingMicRestoreState = pendingMicRestoreStateRef.current;

    if (ownVoiceState.soundMuted) {
      pendingMicRestoreStateRef.current = null;
    }

    updateOwnVoiceState({ micMuted: nextMicMuted });
    playSound(
      nextMicMuted
        ? SoundType.OWN_USER_MUTED_MIC
        : SoundType.OWN_USER_UNMUTED_MIC
    );

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
      logVoiceError('mic: toggle failed, rolled back', error, {
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
    startMicStream,
    currentVoiceChannelId,
    localAudioStream
  ]);

  const toggleSound = useCallback(async () => {
    if (isTogglingSound.current) return;
    isTogglingSound.current = true;

    const nextSoundMuted = !ownVoiceState.soundMuted;
    const trpc = getTRPCClient();

    logVoice('sound: toggle requested', { soundMuted: nextSoundMuted });
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

      if (pendingMicRestoreState?.shouldRestoreOnUndeafen) {
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
      logVoiceError('sound: toggle failed, rolled back', error, {
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
    currentVoiceChannelId,
    localAudioStream,
    startMicStream
  ]);

  const toggleWebcam = useCallback(async () => {
    if (!currentVoiceChannelId) return;
    if (isTogglingWebcam.current) return;
    isTogglingWebcam.current = true;

    const newState = !ownVoiceState.webcamEnabled;
    const trpc = getTRPCClient();

    logVoice('webcam: toggle requested', { enabled: newState });

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

      logVoiceError('webcam: toggle failed, rolled back', error, {
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

  const startScreenShare = useCallback(async () => {
    if (isTogglingScreenShare.current) return;
    isTogglingScreenShare.current = true;

    const transport = getScreenShareTransport();

    logVoice('screen: start requested', { transport });
    updateOwnVoiceState({ sharingScreen: true });
    playSound(SoundType.OWN_USER_STARTED_SCREENSHARE);

    try {
      const trpc = getTRPCClient();
      const video = await startScreenShareStream(transport);

      video.onended = async () => {
        stopScreenShareStream();
        updateOwnVoiceState({ sharingScreen: false });

        try {
          const client = getTRPCClient();

          await client.voice.updateState.mutate({ sharingScreen: false });
        } catch {
          // ignore
        }
      };

      await trpc.voice.updateState.mutate({ sharingScreen: true });
    } catch (error) {
      updateOwnVoiceState({ sharingScreen: false });
      stopScreenShareStream();

      try {
        const trpc = getTRPCClient();

        await trpc.voice.updateState.mutate({ sharingScreen: false });
      } catch {
        // ignore
      }

      const wasAborted = error instanceof Error && error.name === 'AbortError';

      if (!wasAborted) {
        logVoiceError('screen: start failed', error, { transport });
      }

      if (wasAborted) return;

      // do not retry through the sfu. the selected transport must remain explicit.
      if (transport === 'direct') {
        toast.error(t('common:directScreenShareFailed'));
      } else {
        toast.error(
          getTrpcError(error, t('common:failedUpdateScreenShareState'))
        );
      }
    } finally {
      isTogglingScreenShare.current = false;
    }
  }, [t, startScreenShareStream, stopScreenShareStream]);

  const stopScreenShare = useCallback(async () => {
    if (isTogglingScreenShare.current) return;
    isTogglingScreenShare.current = true;

    logVoice('screen: stop requested');
    updateOwnVoiceState({ sharingScreen: false });
    playSound(SoundType.OWN_USER_STOPPED_SCREENSHARE);
    stopScreenShareStream();

    try {
      const trpc = getTRPCClient();

      await trpc.voice.updateState.mutate({ sharingScreen: false });
    } catch (error) {
      logVoiceError('screen: stop state update failed', error);
      toast.error(
        getTrpcError(error, t('common:failedUpdateScreenShareState'))
      );
    } finally {
      isTogglingScreenShare.current = false;
    }
  }, [t, stopScreenShareStream]);

  const toggleScreenShare = useCallback(async () => {
    if (isTogglingScreenShare.current) return;

    if (!ownVoiceState.sharingScreen) {
      openDialog(Dialog.SCREEN_SHARE_SETTINGS);
      return;
    }

    await stopScreenShare();
  }, [ownVoiceState.sharingScreen, stopScreenShare]);

  return {
    toggleMic,
    toggleSound,
    toggleWebcam,
    toggleScreenShare,
    startScreenShare
  };
};

export { useVoiceControls };
