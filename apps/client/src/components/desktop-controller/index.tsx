import { requestConfirmation } from '@/features/dialogs/actions';
import {
  useDesktopConnectionState,
  useTotalHasUnreadMentions,
  useTotalUnreadCount
} from '@/features/server/hooks';
import { getDesktopApi } from '@/helpers/desktop-api';
import { memo, useEffect } from 'react';

const DesktopController = memo(() => {
  const desktopApi = getDesktopApi();
  const unreadCount = useTotalUnreadCount();
  const hasUnreadMentions = useTotalHasUnreadMentions();
  const connectionState = useDesktopConnectionState();

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

  useEffect(() => {
    if (!desktopApi) {
      return;
    }

    desktopApi.setConnectionState(connectionState);
  }, [desktopApi, connectionState]);

  return null;
});

export { DesktopController };
