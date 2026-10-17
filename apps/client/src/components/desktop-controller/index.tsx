import { requestConfirmation } from '@/features/dialogs/actions';
import { useDesktopApi } from '@/hooks/use-desktop-api';
import { memo, useEffect } from 'react';

const DesktopController = memo(() => {
  const desktopApi = useDesktopApi();

  useEffect(() => {
    if (!desktopApi) {
      return;
    }

    return desktopApi.setConfirmationHandler(requestConfirmation);
  }, [desktopApi]);

  return null;
});

export { DesktopController };
