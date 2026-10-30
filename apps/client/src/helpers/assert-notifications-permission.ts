import { i18n } from '@/i18n';
import { toast } from 'sonner';

const assertNotificationsPermission = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      toast.error(i18n.t('common:notificationPermissionDenied'));

      return;
    }
  }
};

export { assertNotificationsPermission };
