import { requestConfirmation } from '@/features/dialogs/actions';
import {
  useTotalHasUnreadMentions,
  useTotalUnreadCount
} from '@/features/server/hooks';
import { useDesktopApi } from '@/hooks/use-desktop-api';
import { memo, useEffect } from 'react';

const DesktopController = memo(() => {
  const desktopApi = useDesktopApi();
  const unreadCount = useTotalUnreadCount();
  const hasUnreadMentions = useTotalHasUnreadMentions();

  useEffect(() => {
    if (!desktopApi) {
      return;
    }

    return desktopApi.setConfirmationHandler(requestConfirmation);
  }, [desktopApi]);

  useEffect(() => {
    if (!desktopApi) {
      return;
    }

    desktopApi.setUnreadState({
      count: unreadCount,
      mentioned: hasUnreadMentions
    });
  }, [desktopApi, unreadCount, hasUnreadMentions]);

  return null;
});

export { DesktopController };
