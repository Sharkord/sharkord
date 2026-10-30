import { i18n } from '@/i18n';
import { requestNotificationPermission } from '@/lib/notifications';
import { toast } from 'sonner';

const assertNotificationsPermission = async () => {
  const granted = await requestNotificationPermission();

  if (!granted) {
    toast.error(i18n.t('common:notificationPermissionDenied'));
  }

  return granted;
};

export { assertNotificationsPermission };
