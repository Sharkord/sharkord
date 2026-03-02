import { useModViewOpen } from '@/features/app/hooks';
import { closeServerScreens } from '@/features/server-screens/actions';
import { useServerScreenInfo } from '@/features/server-screens/hooks';
import {
  createElement,
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  type JSX
} from 'react';
import { createPortal } from 'react-dom';
import { ServerScreen } from './screens';

const ScreensMap = {
  [ServerScreen.SERVER_SETTINGS]: lazy(
    () =>
      import('./server-settings').then((m) => ({ default: m.ServerSettings }))
  ),
  [ServerScreen.CHANNEL_SETTINGS]: lazy(
    () =>
      import('./channel-settings').then((m) => ({
        default: m.ChannelSettings
      }))
  ),
  [ServerScreen.USER_SETTINGS]: lazy(
    () =>
      import('./user-settings').then((m) => ({ default: m.UserSettings }))
  ),
  [ServerScreen.CATEGORY_SETTINGS]: lazy(
    () =>
      import('./category-settings').then((m) => ({
        default: m.CategorySettings
      }))
  )
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

    component = (
      <Suspense fallback={null}>
        {/* @ts-expect-error - é lidar irmoum */}
        {createElement(ScreensMap[openServerScreen], baseProps)}
      </Suspense>
    );
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
