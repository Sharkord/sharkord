import { usePushToTalkActive } from '@/features/app/hooks';
import { useCurrentVoiceChannelId } from '@/features/server/channels/hooks';
import { ownVoiceStateSelector } from '@/features/server/voice/selectors';
import { store } from '@/features/store';
import { bridgeLogger } from '@/helpers/browser-logger';
import { useHotkeyAction } from '@/hooks/use-hotkeys';
import { CoreHotkeyAction } from '@/lib/hotkeys/actions';
import type { THotkeyPhase } from '@/lib/hotkeys/types';
import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

type TUseVoiceHotkeysParams = {
  toggleMic: () => Promise<void>;
  toggleSound: () => Promise<void>;
};

const MAX_RECONCILE_ATTEMPTS = 4;

const useVoiceHotkeys = ({
  toggleMic,
  toggleSound
}: TUseVoiceHotkeysParams) => {
  const { t } = useTranslation('settings');
  const currentVoiceChannelId = useCurrentVoiceChannelId();
  const isPushToTalk = usePushToTalkActive();

  const toggleMicRef = useRef(toggleMic);
  const wantMicMutedRef = useRef(true);
  const isReconcilingRef = useRef(false);

  toggleMicRef.current = toggleMic;

  // toggleMic ignores a call while a previous one is still in flight, so a quick
  // release would be lost and leave the mic open. this keeps toggling until the
  // mic matches what the key says, reading the store because the closures
  // captured by toggleMic go stale during the awaits
  const reconcileMic = useCallback(async () => {
    if (isReconcilingRef.current) {
      return;
    }

    isReconcilingRef.current = true;

    try {
      for (let attempt = 0; attempt < MAX_RECONCILE_ATTEMPTS; attempt++) {
        const { micMuted: before } = ownVoiceStateSelector(store.getState());

        if (before === wantMicMutedRef.current) {
          break;
        }

        await toggleMicRef.current();

        const { micMuted: after } = ownVoiceStateSelector(store.getState());

        // the toggle was refused (deafened, or busy elsewhere): retrying cannot help
        if (after === before) {
          break;
        }
      }
    } finally {
      isReconcilingRef.current = false;
    }
  }, []);

  // push to talk keeps the mic closed unless the key is held
  useEffect(() => {
    if (!isPushToTalk || !currentVoiceChannelId) {
      return;
    }

    wantMicMutedRef.current = true;
    reconcileMic();
  }, [isPushToTalk, currentVoiceChannelId, reconcileMic]);

  const handleToggleMic = useCallback(() => {
    // push to talk owns the mic, a toggle would fight it
    if (isPushToTalk) {
      bridgeLogger.info('toggle mic ignored, push to talk is on');

      return;
    }

    toggleMic();
  }, [isPushToTalk, toggleMic]);

  const handleToggleSound = useCallback(() => {
    toggleSound();
  }, [toggleSound]);

  const handlePushToTalk = useCallback(
    (phase: THotkeyPhase) => {
      wantMicMutedRef.current = phase === 'up';
      reconcileMic();
    },
    [reconcileMic]
  );

  useHotkeyAction(
    {
      id: CoreHotkeyAction.TOGGLE_MIC,
      label: t('hotkeyToggleMic'),
      mode: 'press'
    },
    handleToggleMic
  );

  useHotkeyAction(
    {
      id: CoreHotkeyAction.TOGGLE_SOUND,
      label: t('hotkeyToggleSound'),
      mode: 'press'
    },
    handleToggleSound
  );

  useHotkeyAction(
    {
      id: CoreHotkeyAction.PUSH_TO_TALK,
      label: t('hotkeyPushToTalk'),
      mode: 'hold'
    },
    handlePushToTalk,
    isPushToTalk
  );
};

export { useVoiceHotkeys };
