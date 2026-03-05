import { TextChannel } from '@/components/channel-view/text';
import { VoiceChannel } from '@/components/channel-view/voice';
import { PluginSlotRenderer } from '@/components/plugin-slot-renderer';
import {
  useSelectedChannelId,
  useSelectedChannelType
} from '@/features/server/channels/hooks';
import { useServerName } from '@/features/server/hooks';
import { ChannelType, PluginSlot } from '@sharkord/shared';
import { Alert, AlertDescription } from '@sharkord/ui';
import { AlertTriangle, ArrowLeft, ArrowRight } from 'lucide-react';
import { memo } from 'react';

type TContentWrapperProps = {
  isDmMode: boolean;
  selectedDmChannelId?: number;
};

const ContentWrapper = memo(
  ({ isDmMode, selectedDmChannelId }: TContentWrapperProps) => {
    const selectedChannelId = useSelectedChannelId();
    const selectedChannelType = useSelectedChannelType();
    const serverName = useServerName();

    let content;

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
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            Select a direct message or start a new one.
          </div>
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
          <VoiceChannel key={selectedChannelId} channelId={selectedChannelId} />
        );
      }
    } else {
      content = (
        <>
          <div className="flex-col gap-2 h-full w-full hidden lg:flex overflow-auto">
            <PluginSlotRenderer slotId={PluginSlot.HOME_SCREEN} />
          </div>
          <div className="flex flex-col items-center justify-center h-full gap-6 p-8 text-center md:hidden">
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-semibold text-foreground">
                Welcome to <span className="bold">{serverName}</span>.
              </h2>
            </div>
            <Alert variant="destructive" className="max-w-md">
              <AlertTriangle />
              <AlertDescription>
                Sharkord is not optimized for mobile devices yet. The experience
                will not be ideal.
              </AlertDescription>
            </Alert>
            <div className="flex flex-col gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  <ArrowRight />
                </span>
                <span>Swipe right to open the channel list</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg">
                  <ArrowLeft />
                </span>
                <span>Swipe left to open the user list</span>
              </div>
            </div>
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
