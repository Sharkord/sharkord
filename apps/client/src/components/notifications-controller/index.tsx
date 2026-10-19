import { jumpToMessage } from '@/features/server/actions';
import { onNotificationClick } from '@/lib/notifications';
import { memo, useEffect } from 'react';

const NotificationsController = memo(() => {
  useEffect(() => onNotificationClick(jumpToMessage), []);

  return null;
});

export { NotificationsController };
