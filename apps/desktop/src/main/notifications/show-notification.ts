import type { TAppNotification } from '@sharkord/shared';
import { Notification, type Session } from 'electron';
import { loadImage } from '../images/load-image';

const visible = new Set<Notification>();

const showNotification = async (
  { title, body, icon }: TAppNotification,
  session: Session,
  onClick: () => void
) => {
  if (!Notification.isSupported()) {
    return;
  }

  const notification = new Notification({
    title,
    body,
    icon: icon ? await loadImage(icon, session) : undefined,
    silent: true
  });

  const release = () => {
    visible.delete(notification);
  };

  notification.on('click', () => {
    release();
    onClick();
  });
  notification.on('close', release);

  visible.add(notification);
  notification.show();
};

export { showNotification };
