import { useEffect, useState } from 'react';
import type { TUpdateState } from '../../shared/types';

const useUpdateState = () => {
  const [state, setState] = useState<TUpdateState | undefined>();

  useEffect(() => {
    let active = true;

    const load = async () => {
      const initial = await window.desktop.getUpdateState();

      if (active) {
        setState(initial);
      }
    };

    load();

    const unsubscribe = window.desktop.onUpdateStateChange(setState);

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  return state;
};

export { useUpdateState };
