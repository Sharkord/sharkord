import { TextChannel } from '@/components/channel-view/text';
import { VoiceChannel } from '@/components/channel-view/voice';
import { VoiceHeader } from '@/components/channel-view/voice/voice-header';
import { ContentHeader } from '@/components/content-header';
import { ContentHeaderTitle } from '@/components/content-header/content-header-title';
import { PluginPageIcon } from '@/components/plugin-page-icon';
import { PluginPageRenderer } from '@/components/plugin-page-renderer';
import { PluginSlotRenderer } from '@/components/plugin-slot-renderer';
import { ThreadContent } from '@/components/thread-sidebar/thread-content';
import { setSelectedThread } from '@/features/app/actions';
import { useSelectedThread } from '@/features/app/hooks';
import { setSelectedChannelId } from '@/features/server/channels/actions';
import {
  useSelectedChannelId,
  useSelectedChannelType
} from '@/features/server/channels/hooks';
import {
  useActiveFullscreenPluginId,
  useActivePluginPage,
  useActivePluginPageId
} from '@/features/server/hooks';
import { useThreadsOpen } from '@/features/server/threads/hooks';
import { ChannelType, PluginSlot } from '@sharkord/shared';
import { MessageCircleMore, MessageSquareText } from 'lucide-react';
import { memo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { SwipeHint } from './swipe-hint';

type TContentWrapperProps = {
  isDmMode: boolean;
  selectedDmChannelId?: number;
};

const ContentWrapper = memo(
  ({ isDmMode, selectedDmChannelId }: TContentWrapperProps) => {
    const { t } = useTranslation();
    const { t: tSidebar } = useTranslation('sidebar');
    const activePluginPage = useActivePluginPage();
    const selectedChannelId = useSelectedChannelId();
    const selectedChannelType = useSelectedChannelType();
    const activeFullscreenPluginId = useActiveFullscreenPluginId();
    const activePluginPageId = useActivePluginPageId();
    const threadsOpen = useThreadsOpen();
    const selectedThread = useSelectedThread();

    const onCloseThread = useCallback(() => setSelectedThread(undefined), []);

    const isTextChannelBeingShown =
      !activeFullscreenPluginId &&
      !threadsOpen &&
      !isDmMode &&
      selectedChannelType === ChannelType.TEXT;

    useEffect(() => {
      if (!isTextChannelBeingShown) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key !== 'Escape' || e.defaultPrevented) return;

        setSelectedChannelId(undefined);
      };

      window.addEventListener('keydown', handleKeyDown);

      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isTextChannelBeingShown]);

    if (activeFullscreenPluginId) {
      return (
        <main className="flex flex-1 flex-col bg-background relative min-w-0 min-h-0">
          <ContentHeader>
            {activePluginPage && (
              <ContentHeaderTitle
                icon={
                  <PluginPageIcon
                    pluginId={activePluginPage.pluginId}
                    icon={activePluginPage.icon}
                  />
                }
              >
                {activePluginPage.label}
              </ContentHeaderTitle>
            )}
          </ContentHeader>
          <div className="flex-col gap-2 min-h-0 flex-1 w-full flex overflow-auto relative bg-background">
            {activePluginPageId ? (
              <PluginPageRenderer
                pluginId={activeFullscreenPluginId}
                pageId={activePluginPageId}
              />
            ) : (
              <PluginSlotRenderer
                slotId={PluginSlot.FULL_SCREEN}
                onlyPluginId={activeFullscreenPluginId}
              />
            )}
          </div>
        </main>
      );
    }

    let content;

    if (threadsOpen) {
      if (selectedThread) {
        content = (
          <ThreadContent
            key={selectedThread.parentMessageId}
            parentMessageId={selectedThread.parentMessageId}
            channelId={selectedThread.channelId}
            onClose={onCloseThread}
          />
        );
      } else {
        content = (
          <>
            <ContentHeader>
              <ContentHeaderTitle icon={<MessageSquareText />}>
                {tSidebar('threads')}
              </ContentHeaderTitle>
            </ContentHeader>
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              {t('selectThreadPrompt')}
            </div>
          </>
        );
      }

      return (
        <main className="flex flex-1 flex-col bg-background relative min-w-0 min-h-0">
          {content}
        </main>
      );
    }

    if (isDmMode) {
      if (selectedDmChannelId) {
        content = (
          <TextChannel
            key={selectedDmChannelId}
            channelId={selectedDmChannelId}
          />
        );
      } else {
        content = (
          <>
            <ContentHeader>
              <ContentHeaderTitle icon={<MessageCircleMore />}>
                {tSidebar('directMessages')}
              </ContentHeaderTitle>
            </ContentHeader>
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              {t('selectDmPrompt')}
            </div>
          </>
        );
      }

      return (
        <main className="flex flex-1 flex-col bg-background relative min-w-0 min-h-0">
          {content}
        </main>
      );
    }

    if (selectedChannelId) {
      if (selectedChannelType === ChannelType.TEXT) {
        content = (
          <TextChannel key={selectedChannelId} channelId={selectedChannelId} />
        );
      } else if (selectedChannelType === ChannelType.VOICE) {
        content = (
          <>
            <VoiceHeader channelId={selectedChannelId} />
            <VoiceChannel
              key={selectedChannelId}
              channelId={selectedChannelId}
            />
          </>
        );
      }
    } else {
      content = (
        <>
          <ContentHeader />
          <div className="flex min-h-0 w-full flex-1 flex-col gap-2 overflow-auto">
            <PluginSlotRenderer
              slotId={PluginSlot.HOME_SCREEN}
              fallback={<SwipeHint />}
            />
          </div>
        </>
      );
    }

    return (
      <main className="flex flex-1 flex-col bg-background relative min-w-0 min-h-0">
        {content}
      </main>
    );
  }
);

export { ContentWrapper };
