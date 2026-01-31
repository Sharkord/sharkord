import { TextChannel } from '@/components/channel-view/text';
import { VoiceChannel } from '@/components/channel-view/voice';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  useSelectedChannelId,
  useSelectedChannelType
} from '@/features/server/channels/hooks';
import { useServerName } from '@/features/server/hooks';
import { ChannelType } from '@sharkord/shared';
import { AlertTriangle, ArrowLeft, ArrowRight } from 'lucide-react';
import { memo } from 'react';

const ContentWrapper = memo(() => {
  const selectedChannelId = useSelectedChannelId();
  const selectedChannelType = useSelectedChannelType();
  const serverName = useServerName();

  let content;

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
    );
  }

  return (
    <main className="flex flex-1 flex-col bg-background relative">
      {content}
    </main>
  );
});

export { ContentWrapper };
