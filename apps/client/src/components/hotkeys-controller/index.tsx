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

    if (e.key === 'Alt') {
      e.preventDefault();
    }
    setModifierKeysHeldMap({
      Shift: e.shiftKey,
      Control: e.ctrlKey,
      Alt: e.altKey
    });
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    setModifierKeysHeldMap({
      Shift: e.shiftKey,
      Control: e.ctrlKey,
      Alt: e.altKey
    });
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
