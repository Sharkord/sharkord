import { toast } from 'sonner';

const assertNotificationsPermission = async () => {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission();

    if (permission !== 'granted') {
      toast.error('Notification permission was denied.');

      return;
    }
  }
};

export { assertNotificationsPermission };
