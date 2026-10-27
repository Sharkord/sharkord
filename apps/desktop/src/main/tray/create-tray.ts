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

const buildImages = (
  base: NativeImage
): Record<TTrayIndicator, NativeImage> => {
  const sized = base.resize({ width: TRAY_ICON_SIZE, height: TRAY_ICON_SIZE });

  return {
    none: sized,
    unread: withDot(sized, WHITE),
    mention: withDot(sized, RED)
  };
};

const createTray = (iconPath: string, showWindow: () => void) => {
  let images = buildImages(nativeImage.createFromPath(iconPath));

  const tray = new Tray(images.none);

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

  const setIcon = (base: NativeImage) => {
    images = buildImages(base);

    tray.setImage(images[indicator]);
  };

  const destroy = () => {
    tray.destroy();
  };

  return { setUnread, setIcon, destroy };
};

type TAppTray = ReturnType<typeof createTray>;

export { createTray };
export type { TAppTray };
