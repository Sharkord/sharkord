import { LeftSidebar } from '@/components/left-sidebar';
import { ModViewSheet } from '@/components/mod-view-sheet';
import { Protect } from '@/components/protect';
import { RightSidebar } from '@/components/right-sidebar';
import { ThreadSidebar } from '@/components/thread-sidebar';
import { TopBar } from '@/components/top-bar';
import { VoiceChatSidebar } from '@/components/voice-chat-sidebar';
import { VoiceProvider } from '@/components/voice-provider';
import {
  useSelectedDmChannelId,
  useSelectedThread,
  useStartOnChannelList,
  useThreadSidebar
} from '@/features/app/hooks';
import { setDmsOpen } from '@/features/server/actions';
import { setSelectedChannelId } from '@/features/server/channels/actions';
import { useSelectedChannelId } from '@/features/server/channels/hooks';
import {
  useActiveFullscreenPluginId,
  useActivePluginPageId,
  useDmsOpen,
  useIsNothingOpen,
  usePublicServerSettings
} from '@/features/server/hooks';
import { useThreadsOpen } from '@/features/server/threads/hooks';
import {
  getLocalStorageItemBool,
  LocalStorageKey,
  setLocalStorageItemBool
} from '@/helpers/storage';
import { useSwipeGestures } from '@/hooks/use-swipe-gestures';
import { cn } from '@/lib/utils';
import { Permission, TestId } from '@sharkord/shared';
import { MEDIA_QUERY, useMediaQuery } from '@sharkord/ui';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { ContentWrapper } from './content-wrapper';
import { PreventBrowser } from './prevent-browser';

const ServerView = memo(() => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileUsersOpen, setIsMobileUsersOpen] = useState(false);
  const [isHomeOpen, setIsHomeOpen] = useState(false);
  const [isDesktopRightSidebarOpen, setIsDesktopRightSidebarOpen] = useState(
    getLocalStorageItemBool(LocalStorageKey.RIGHT_SIDEBAR_STATE, true)
  );
  const dmsOpen = useDmsOpen();
  const selectedDmChannelId = useSelectedDmChannelId();
  const publicSettings = usePublicServerSettings();
  const previousServerChannelIdRef = useRef<number | undefined>(undefined);
  const { isOpen: isThreadSidebarOpen } = useThreadSidebar();
  const selectedChannelId = useSelectedChannelId();
  const selectedThread = useSelectedThread();
  const isLargeScreen = useMediaQuery(MEDIA_QUERY.lg);
  const startOnChannelList = useStartOnChannelList();
  const isNothingOpen = useIsNothingOpen();
  const threadsOpen = useThreadsOpen();
  const isHomeShown = isHomeOpen && !dmsOpen && !threadsOpen;
  const isChannelListHome = startOnChannelList && isNothingOpen && !isHomeShown;
  const activeFullscreenPluginId = useActiveFullscreenPluginId();
  const activePluginPageId = useActivePluginPageId();

  // whatever is picked in a drawer (a channel, a plugin page, or a dm from a member's card) replaces the
  // content behind it, so the drawers have to get out of the way for it to be seen
  const navigationKey = `${selectedChannelId}:${selectedDmChannelId}:${selectedThread?.parentMessageId}:${activeFullscreenPluginId}:${activePluginPageId}`;
  const [prevNavigationKey, setPrevNavigationKey] = useState(navigationKey);

  if (navigationKey !== prevNavigationKey) {
    setPrevNavigationKey(navigationKey);
    setIsMobileMenuOpen(false);
    setIsMobileUsersOpen(false);

    if (!isNothingOpen) {
      setIsHomeOpen(false);
    }
  }

  const handleRightSidebarToggle = useCallback(() => {
    if (!isLargeScreen) {
      setIsMobileUsersOpen((prev) => !prev);

      return;
    }

    setIsDesktopRightSidebarOpen((prev) => !prev);
    setLocalStorageItemBool(
      LocalStorageKey.RIGHT_SIDEBAR_STATE,
      !isDesktopRightSidebarOpen
    );
  }, [isDesktopRightSidebarOpen, isLargeScreen]);

  const handleOpenChannelList = useCallback(() => {
    setIsMobileUsersOpen(false);
    setIsMobileMenuOpen(true);
  }, []);

  const handleOpenHome = useCallback(() => {
    setIsHomeOpen(true);
    setIsMobileMenuOpen(false);
  }, []);

  const handleCloseMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const handleCloseMobileUsers = useCallback(() => {
    setIsMobileUsersOpen(false);
  }, []);

  const handleSwipeRight = useCallback(() => {
    if (isMobileMenuOpen || isMobileUsersOpen) {
      setIsMobileMenuOpen(false);
      setIsMobileUsersOpen(false);
      return;
    }

    setIsMobileMenuOpen(true);
  }, [isMobileMenuOpen, isMobileUsersOpen]);

  const handleSwipeLeft = useCallback(() => {
    if (isMobileMenuOpen || isMobileUsersOpen) {
      setIsMobileMenuOpen(false);
      setIsMobileUsersOpen(false);

      return;
    }

    setIsMobileUsersOpen(true);
  }, [isMobileMenuOpen, isMobileUsersOpen]);

  const swipeHandlers = useSwipeGestures({
    onSwipeRight: handleSwipeRight,
    onSwipeLeft: handleSwipeLeft
  });

  useEffect(() => {
    if (publicSettings?.directMessagesEnabled === false && dmsOpen) {
      setDmsOpen(false);

      if (previousServerChannelIdRef.current) {
        setSelectedChannelId(previousServerChannelIdRef.current);
      }
    }
  }, [publicSettings?.directMessagesEnabled, dmsOpen]);

  return (
    <VoiceProvider>
      <div
        data-testid={TestId.SERVER_VIEW}
        className="flex h-dvh flex-col bg-background text-foreground dark"
        {...swipeHandlers}
      >
        <TopBar
          onToggleRightSidebar={handleRightSidebarToggle}
          onOpenChannelList={handleOpenChannelList}
          isOpen={isLargeScreen ? isDesktopRightSidebarOpen : isMobileUsersOpen}
        />
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <PreventBrowser />

          {isMobileMenuOpen && (
            <div
              className="md:hidden fixed inset-0 bg-black/50 z-30"
              onClick={handleCloseMobileMenu}
            />
          )}

          {isMobileUsersOpen && (
            <div
              className="lg:hidden fixed inset-0 bg-black/50 z-30"
              onClick={handleCloseMobileUsers}
            />
          )}

          <LeftSidebar
            onOpenHome={handleOpenHome}
            className={cn(
              'md:relative md:flex fixed inset-0 left-0 h-full max-w-[85vw] md:max-w-none z-40 md:z-0 transition-transform duration-300 ease-in-out',
              isChannelListHome && 'max-w-none max-md:w-full!',
              isMobileMenuOpen || isChannelListHome
                ? 'translate-x-0'
                : '-translate-x-full md:translate-x-0'
            )}
          />

          <ContentWrapper
            isDmMode={dmsOpen}
            selectedDmChannelId={selectedDmChannelId}
          />

          <VoiceChatSidebar />

          <ThreadSidebar isOpen={isThreadSidebarOpen} />

          <RightSidebar
            className={cn(
              'fixed top-0 bottom-0 right-0 h-full max-w-[85vw] lg:max-w-none z-40',
              'lg:relative lg:z-0',
              isMobileUsersOpen
                ? 'translate-x-0 lg:translate-x-0'
                : 'translate-x-full lg:translate-x-0'
            )}
            isOpen={isMobileUsersOpen || isDesktopRightSidebarOpen}
          />

          <Protect permission={Permission.MANAGE_USERS}>
            <ModViewSheet />
          </Protect>
        </div>
      </div>
    </VoiceProvider>
  );
});

export { ServerView };
