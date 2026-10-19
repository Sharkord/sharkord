import type { TAppNotification } from '@sharkord/shared';
import { nativeImage, Notification, type Session } from 'electron';

const ICON_TIMEOUT_MS = 2_000;

const visible = new Set<Notification>();

const loadIcon = async (url: string, session: Session) => {
  try {
    const response = await session.fetch(url, {
      signal: AbortSignal.timeout(ICON_TIMEOUT_MS)
    });

    if (!response.ok) {
      return undefined;
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const image = nativeImage.createFromBuffer(buffer);

    return image.isEmpty() ? undefined : image;
  } catch {
    return undefined;
  }
};

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
    icon: icon ? await loadIcon(icon, session) : undefined,
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
