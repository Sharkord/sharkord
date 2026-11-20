import { useCallback, useState } from 'react';

// refreshed on open, so the details are current without polling
export const useSessionOpen = (refetch: () => Promise<void>) => {
  const [open, setOpen] = useState(false);

  const onOpenChange = useCallback(
    (nextOpen: boolean) => {
      setOpen(nextOpen);

      if (nextOpen) {
        refetch();
      }
    },
    [refetch]
  );

  return { open, onOpenChange };
};
