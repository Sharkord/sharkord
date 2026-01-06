import type { DependencyList, EffectCallback } from 'react';
import { useEffect, useRef } from 'react';

const useStrictEffect = (effect: EffectCallback, deps?: DependencyList) => {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;

    const cleanup = effect();

    ran.current = true;

    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};

export { useStrictEffect };
