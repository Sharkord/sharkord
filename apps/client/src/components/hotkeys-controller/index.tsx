import {
  setModifierKeysHeldMap,
  togglePluginSlotDebug
} from '@/features/app/actions';
import { memo, useEffect } from 'react';
import { ShortcutRegistrar } from '../shortcut-registrar';

const HotkeysController = memo(() => {
  const pressedKeys = new Set<string>();

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.repeat) return;
    pressedKeys.add(e.key);
    console.log('Pressed keys:', pressedKeys);
    ShortcutRegistrar.submit(pressedKeys, e);

    setModifierKeysHeldMap({
      Shift: e.shiftKey,
      Control: e.ctrlKey,
      Alt: e.altKey
    });
  };

  const handleKeyUp = (e: KeyboardEvent) => {
    pressedKeys.delete(e.key);

    setModifierKeysHeldMap({
      Shift: e.shiftKey,
      Control: e.ctrlKey,
      Alt: e.altKey
    });
  };

  const handleBlur = () => {
    setModifierKeysHeldMap({
      Shift: false,
      Control: false,
      Alt: false
    });
  };

  useEffect(() => {
    ShortcutRegistrar.register([], 'F4', togglePluginSlotDebug);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      ShortcutRegistrar.deregister([], 'F4');
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  });
  return null;
});

export { HotkeysController };
