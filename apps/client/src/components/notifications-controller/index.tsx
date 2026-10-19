import { jumpToMessage } from '@/features/server/actions';
import { dispatchPluginNotificationClick } from '@/features/server/plugins/notification-click-registry';
import { onNotificationClick } from '@/lib/notifications';
import type { TNotificationTarget } from '@sharkord/shared';
import { memo, useEffect } from 'react';

const openNotificationTarget = (target: TNotificationTarget) => {
  if (target.type === 'plugin') {
    dispatchPluginNotificationClick(target.pluginId, target.data);

    return;
  }

  jumpToMessage(target);
};

// a click on a notification leads where it points, whichever platform showed it
const NotificationsController = memo(() => {
  useEffect(() => onNotificationClick(openNotificationTarget), []);

  return null;
});

export { NotificationsController };
