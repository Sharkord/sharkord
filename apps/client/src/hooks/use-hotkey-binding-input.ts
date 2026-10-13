import { useHotkeyBinding, useHotkeyState } from '@/hooks/use-hotkeys';
import { findConflictLabel } from '@/lib/hotkeys/bindings';
import { useCallback, useMemo } from 'react';
import { useHotkeyInput } from './use-hotkey-input';

const useHotkeyBindingInput = (actionId: string) => {
  const { combo, error, setCombo, clear } = useHotkeyBinding(actionId);
  const { actions, bindings } = useHotkeyState();

  const findConflict = useCallback(
    (next: string) => findConflictLabel(bindings, actions, actionId, next),
    [bindings, actions, actionId]
  );

  const handleChange = useCallback(
    (next?: string) => {
      if (next) {
        setCombo(next);

        return;
      }

      clear();
    },
    [setCombo, clear]
  );

  const { labels, onChange, onClear } = useHotkeyInput({
    onChange: handleChange,
    findConflict
  });

  return useMemo(
    () => ({ value: combo, error, labels, onChange, onClear }),
    [combo, error, labels, onChange, onClear]
  );
};

export { useHotkeyBindingInput };
