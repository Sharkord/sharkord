import { setHotkeysEnabled } from '@/features/app/actions';
import { useHotkeysEnabled } from '@/features/app/hooks';
import {
  getLocalStorageItem,
  LocalStorageKey,
  setLocalStorageItem
} from '@/helpers/storage';
import { useHotkeyState } from '@/hooks/use-hotkeys';
import { hotkeys } from '@/lib/hotkeys/dispatcher';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSettingsForm } from '../../settings-shell/use-settings-form';
import { BridgeSettings } from './bridge-settings';
import { bindingsFromRecord, bindingsToRecord } from './helpers';
import { HotkeyGroups } from './hotkey-groups';
import type { THotkeysValues } from './types';

const Hotkeys = memo(() => {
  const { t } = useTranslation('settings');
  const hotkeysEnabled = useHotkeysEnabled();
  const { bindings } = useHotkeyState();

  const initialValues = useMemo<THotkeysValues>(
    () => ({
      enabled: hotkeysEnabled,
      token: getLocalStorageItem(LocalStorageKey.HOTKEY_BRIDGE_TOKEN) ?? '',
      bindings: bindingsToRecord(bindings)
    }),
    [hotkeysEnabled, bindings]
  );

  const onSave = useCallback(async (values: THotkeysValues) => {
    setLocalStorageItem(
      LocalStorageKey.HOTKEY_BRIDGE_TOKEN,
      values.token.trim()
    );

    hotkeys.setBindings(bindingsFromRecord(values.bindings));

    setHotkeysEnabled(values.enabled);

    hotkeys.reconnect();
  }, []);

  const { values, onChange } = useSettingsForm<THotkeysValues>({
    initialValues,
    onSave,
    successMessage: t('hotkeysSaved'),
    errorMessage: t('failedSaveHotkeys')
  });

  return (
    <div className="space-y-4">
      <BridgeSettings values={values} onChange={onChange} />
      {values.enabled && <HotkeyGroups values={values} onChange={onChange} />}
    </div>
  );
});

export { Hotkeys };
