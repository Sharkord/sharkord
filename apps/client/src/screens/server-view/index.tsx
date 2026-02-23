import { TopicTopbar } from '@/components/topic-topbar';
import { LeftSidebar } from '@/components/left-sidebar';
import { ModViewSheet } from '@/components/mod-view-sheet';
import { Protect } from '@/components/protect';
import { RightSidebar } from '@/components/right-sidebar';
import { ThreadSidebar } from '@/components/thread-sidebar';
import { TopBar } from '@/components/top-bar';
import { VoiceChatSidebar } from '@/components/voice-chat-sidebar';
import { VoiceProvider } from '@/components/voice-provider';
import { useThreadSidebar } from '@/features/app/hooks';
import { getLocalStorageItemBool, LocalStorageKey } from '@/helpers/storage';
import { useSwipeGestures } from '@/hooks/use-swipe-gestures';
import { cn } from '@/lib/utils';
import { Permission } from '@sharkord/shared';
import { memo, useCallback, useState } from 'react';
import { ContentWrapper } from './content-wrapper';
import { PreventBrowser } from './prevent-browser';
import { PinnedMessageProvider } from '../../components/pinned-message-provider';

const ServerView = memo(() => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileUsersOpen, setIsMobileUsersOpen] = useState(false);
  const [isDesktopRightSidebarOpen, setIsDesktopRightSidebarOpen] = useState(
    getLocalStorageItemBool(LocalStorageKey.RIGHT_SIDEBAR_STATE, true)
  );
  const [isVoiceChatSidebarOpen, setIsVoiceChatSidebarOpen] = useState(
    getLocalStorageItemBool(LocalStorageKey.VOICE_CHAT_SIDEBAR_STATE, false)
  );
  const { isOpen: isThreadSidebarOpen } = useThreadSidebar();

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
      <PinnedMessageProvider>
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
            <div className="relative min-h-0 overflow-y-auto flex flex-col flex-1">
              <TopicTopbar />
              <ContentWrapper />
            </div>

            <VoiceChatSidebar isOpen={isVoiceChatSidebarOpen} />

            <ThreadSidebar isOpen={isThreadSidebarOpen} />

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
      </PinnedMessageProvider>
    </VoiceProvider>
  );
});

export { ServerView };
