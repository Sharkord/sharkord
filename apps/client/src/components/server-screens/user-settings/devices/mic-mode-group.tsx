import { HotkeyBindGroup } from '@/components/hotkey-input/hotkey-bind-group';
import { setMicMode } from '@/features/app/actions';
import { useMicMode } from '@/features/app/hooks';
import { useHotkeyState } from '@/hooks/use-hotkeys';
import { CoreHotkeyAction } from '@/lib/hotkeys/actions';
import { MicMode } from '@/types';
import {
  Group,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@sharkord/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const MicModeGroup = memo(() => {
  const { t } = useTranslation('settings');
  const micMode = useMicMode();
  const { status, capabilities } = useHotkeyState();

  const bridgeCannotReleaseKeys = status === 'connected' && !capabilities.keyUp;
  const description = bridgeCannotReleaseKeys
    ? t('micModePushToTalkUnsupported')
    : undefined;

  const handleChange = useCallback((value: string) => {
    setMicMode(value as MicMode);
  }, []);

  return (
    <>
      <Group label={t('micModeLabel')} description={description}>
        <Select value={micMode} onValueChange={handleChange}>
          <SelectTrigger className="w-92">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value={MicMode.OPEN}>{t('micModeOpen')}</SelectItem>
              <SelectItem
                value={MicMode.PUSH_TO_TALK}
                disabled={bridgeCannotReleaseKeys}
              >
                {t('micModePushToTalk')}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </Group>

      {micMode === MicMode.PUSH_TO_TALK && (
        <HotkeyBindGroup
          actionId={CoreHotkeyAction.PUSH_TO_TALK}
          label={t('hotkeyPushToTalk')}
        />
      )}
    </>
  );
});

export { MicModeGroup };
