import type { TDesktopUnreadState } from '@sharkord/shared';
import { app, Menu, nativeImage, Tray, type NativeImage } from 'electron';
import { i18n } from '../i18n';
import {
  getIndicator,
  RED,
  TRAY_ICON_SIZE,
  WHITE,
  withDot,
  type TTrayIndicator
} from './helpers';

const createTray = (iconPath: string, showWindow: () => void) => {
  const source = nativeImage.createFromPath(iconPath);
  const base = source.resize({ width: TRAY_ICON_SIZE, height: TRAY_ICON_SIZE });

  const images: Record<TTrayIndicator, NativeImage> = {
    none: base,
    unread: withDot(base, WHITE),
    mention: withDot(base, RED)
  };

  const tray = new Tray(base);

  let indicator: TTrayIndicator = 'none';

  tray.setToolTip('Sharkord');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: i18n.t('tray.show'), click: showWindow },
      { type: 'separator' },
      { label: i18n.t('tray.quit'), click: () => app.quit() }
    ])
  );
  tray.on('click', showWindow);

  const setUnread = (unread: Record<string, TDesktopUnreadState>) => {
    const next = getIndicator(unread);

    if (next === indicator) {
      return;
    }

    indicator = next;
    tray.setImage(images[next]);
  };

  const destroy = () => {
    tray.destroy();
  };

  return { setUnread, destroy };
};

type TAppTray = ReturnType<typeof createTray>;

export { createTray };
export type { TAppTray };
