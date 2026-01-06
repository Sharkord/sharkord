import { useEffect } from 'react';

const usePreventExit = (condition: unknown) => {
  useEffect(() => {
    if (!condition) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Modern browsers require returnValue to be set
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [condition]);
};

export { usePreventExit };
