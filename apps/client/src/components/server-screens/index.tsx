import { useModViewOpen } from '@/features/app/hooks';
import { closeServerScreens } from '@/features/server-screens/actions';
import { useServerScreenInfo } from '@/features/server-screens/hooks';
import { createElement, memo, useCallback, useEffect, type JSX } from 'react';
import { createPortal } from 'react-dom';
import { CategorySettings } from './category-settings';
import { ChannelSettings } from './channel-settings';
import { ServerScreen } from './screens';
import { ServerSettings } from './server-settings';
import { UserSettings } from './user-settings';

const ScreensMap = {
  [ServerScreen.SERVER_SETTINGS]: ServerSettings,
  [ServerScreen.CHANNEL_SETTINGS]: ChannelSettings,
  [ServerScreen.USER_SETTINGS]: UserSettings,
  [ServerScreen.CATEGORY_SETTINGS]: CategorySettings
};

const portalRoot = document.getElementById('portal')!;

type TComponentWrapperProps = {
  children: React.ReactNode;
};

const ComponentWrapper = ({ children }: TComponentWrapperProps) => {
  const { isOpen } = useModViewOpen();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // when mod view is open, do not close server screens
      if (isOpen) return;

      if (e.key === 'Escape') {
        closeServerScreens();
      }
    },
    [isOpen]
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  return children;
};

const ServerScreensProvider = memo(() => {
  const { isOpen, props, openServerScreen } = useServerScreenInfo();

  let component: JSX.Element | null = null;

  if (openServerScreen && ScreensMap[openServerScreen]) {
    const baseProps = {
      ...props,
      isOpen,
      close: closeServerScreens
    };

    // @ts-expect-error - é lidar irmoum
    component = createElement(ScreensMap[openServerScreen], baseProps);
  }

  const realIsOpen = isOpen && !!component;

  if (realIsOpen) {
    portalRoot.style.display = 'block';
  } else {
    portalRoot.style.display = 'none';
  }

  if (!realIsOpen) return null;

  return createPortal(
    <ComponentWrapper>{component}</ComponentWrapper>,
    portalRoot
  );
});

export { ServerScreensProvider };
