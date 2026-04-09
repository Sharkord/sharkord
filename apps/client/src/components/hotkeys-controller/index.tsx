import {
  setModifierKeysHeldMap,
  togglePluginSlotDebug
} from '@/features/app/actions';
import { memo, useCallback, useEffect } from 'react';

const HotkeysController = memo(() => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'F4') {
      togglePluginSlotDebug();
    }

    const hotkeyState: Record<string, boolean> = {};
    hotkeyState['Shift'] = e.shiftKey;
    hotkeyState['Control'] = e.ctrlKey;
    if (e.key === 'Alt') {
      e.preventDefault();
    }
    hotkeyState['Alt'] = e.altKey;
    setModifierKeysHeldMap(hotkeyState);
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const hotkeyState: Record<string, boolean> = {};
    hotkeyState['Shift'] = e.shiftKey;
    hotkeyState['Control'] = e.ctrlKey;
    hotkeyState['Alt'] = e.altKey;
    setModifierKeysHeldMap(hotkeyState);
  }, []);

  const handleBlur = useCallback(() => {
    setModifierKeysHeldMap({
      Shift: false,
      Control: false,
      Alt: false
    });
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [handleKeyDown, handleKeyUp, handleBlur]);
  return null;
});

export { HotkeysController };
