import { setHotkeyIsHeld, togglePluginSlotDebug } from '@/features/app/actions';
import { memo, useCallback, useEffect } from 'react';

const HotkeysController = memo(() => {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'F4') {
      togglePluginSlotDebug();
    }

    let hotkeyState: Record<string, boolean> = {};
    hotkeyState['Shift'] = e.shiftKey;
    hotkeyState['Control'] = e.ctrlKey;
    if (e.key === 'Alt') {
      e.preventDefault();
    }
    hotkeyState['Alt'] = e.altKey;
    setHotkeyIsHeld(hotkeyState);
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    let hotkeyState: Record<string, boolean> = {};
    hotkeyState['Shift'] = e.shiftKey;
    hotkeyState['Control'] = e.ctrlKey;
    hotkeyState['Alt'] = e.altKey;
    setHotkeyIsHeld(hotkeyState);
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);
  return null;
});

export { HotkeysController };
