import { LeftSidebar } from '@/components/left-sidebar';
import { ModViewSheet } from '@/components/mod-view-sheet';
import { Protect } from '@/components/protect';
import { RightSidebar } from '@/components/right-sidebar';
import { TopBar } from '@/components/top-bar';
import { VoiceChatSidebar } from '@/components/voice-chat-sidebar';
import { VoiceProvider } from '@/components/voice-provider';
import { getLocalStorageItem, LocalStorageKey } from '@/helpers/storage';
import { useSwipeGestures } from '@/hooks/use-swipe-gestures';
import { cn } from '@/lib/utils';
import { Permission } from '@sharkord/shared';
import { memo, useCallback, useState } from 'react';
import { ContentWrapper } from './content-wrapper';
import { PreventBrowser } from './prevent-browser';

const ServerView = memo(() => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileUsersOpen, setIsMobileUsersOpen] = useState(false);
  const [isDesktopRightSidebarOpen, setIsDesktopRightSidebarOpen] = useState(
    getLocalStorageItem(LocalStorageKey.RIGHT_SIDEBAR_STATE) === 'true' || false
  );
  const [isVoiceChatSidebarOpen, setIsVoiceChatSidebarOpen] = useState(
    getLocalStorageItem(LocalStorageKey.VOICE_CHAT_SIDEBAR_STATE) === 'true' ||
      false
  );

  const handleDesktopRightSidebarToggle = useCallback(() => {
    setIsDesktopRightSidebarOpen((prev) => !prev);
    localStorage.setItem(
      LocalStorageKey.RIGHT_SIDEBAR_STATE,
      !isDesktopRightSidebarOpen ? 'true' : 'false'
    );
  }, [isDesktopRightSidebarOpen]);

  const handleVoiceChatSidebarToggle = useCallback(() => {
    setIsVoiceChatSidebarOpen((prev) => !prev);
    localStorage.setItem(
      LocalStorageKey.VOICE_CHAT_SIDEBAR_STATE,
      !isVoiceChatSidebarOpen ? 'true' : 'false'
    );
  }, [isVoiceChatSidebarOpen]);

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

  return (
    <VoiceProvider>
      <div
        className="flex h-dvh flex-col bg-background text-foreground dark"
        {...swipeHandlers}
      >
        <TopBar
          onToggleRightSidebar={handleDesktopRightSidebarToggle}
          isOpen={isDesktopRightSidebarOpen}
          onToggleVoiceChat={handleVoiceChatSidebarToggle}
          isVoiceChatOpen={isVoiceChatSidebarOpen}
        />
        <div className="relative flex min-h-0 flex-1 overflow-hidden">
          <PreventBrowser />

          {isMobileMenuOpen && (
            <div
              className="md:hidden fixed inset-0 bg-black/50 z-30"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}

          {isMobileUsersOpen && (
            <div
              className="lg:hidden fixed inset-0 bg-black/50 z-30"
              onClick={() => setIsMobileUsersOpen(false)}
            />
          )}

          <LeftSidebar
            className={cn(
              'md:relative md:flex fixed inset-0 left-0 h-full z-40 md:z-0 transition-transform duration-300 ease-in-out',
              isMobileMenuOpen
                ? 'translate-x-0'
                : '-translate-x-full md:translate-x-0'
            )}
          />

          <ContentWrapper />

          <VoiceChatSidebar isOpen={isVoiceChatSidebarOpen} />

          <RightSidebar
            className={cn(
              'fixed top-0 bottom-0 right-0 h-full z-40 transition-all duration-500 ease-in-out',
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
