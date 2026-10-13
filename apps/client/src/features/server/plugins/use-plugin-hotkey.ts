import { useHotkeyBindingInput } from '@/hooks/use-hotkey-binding-input';
import { useHotkeyAction } from '@/hooks/use-hotkeys';
import type {
  TPluginHotkeyAction,
  TPluginHotkeyBinding,
  TPluginHotkeyPhase
} from '@sharkord/shared';
import { formatCombo } from '@sharkord/ui';
import { useMemo } from 'react';
import { usePluginId } from './plugin-id-context';

const toActionId = (pluginId: string | null, id: string) =>
  `${pluginId ?? 'unknown'}:${id}`;

const usePluginHotkey = (
  action: TPluginHotkeyAction,
  handler: (phase: TPluginHotkeyPhase) => void
) => {
  const pluginId = usePluginId();

  useHotkeyAction(
    {
      id: toActionId(pluginId, action.id),
      label: action.label,
      mode: action.mode ?? 'press'
    },
    handler,
    !!pluginId
  );
};

const usePluginHotkeyBinding = (id: string): TPluginHotkeyBinding => {
  const pluginId = usePluginId();
  const input = useHotkeyBindingInput(toActionId(pluginId, id));
  const { value } = input;

  return useMemo(
    () => ({ ...input, display: value ? formatCombo(value) : undefined }),
    [input, value]
  );
};

export { usePluginHotkey, usePluginHotkeyBinding };
