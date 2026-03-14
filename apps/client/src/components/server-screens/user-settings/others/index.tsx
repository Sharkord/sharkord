import { setAutoJoinLastChannel, setChatInputMaxHeightVh } from '@/features/app/actions';
import { useAutoJoinLastChannel, useChatInputMaxHeightVh } from '@/features/app/hooks';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Group,
  Slider,
  Switch
} from '@sharkord/ui';
import { memo } from 'react';

const Others = memo(() => {
  const autoJoinLastChannel = useAutoJoinLastChannel();
  const chatInputMaxHeightVh = useChatInputMaxHeightVh();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Others</CardTitle>
        <CardDescription>
          General settings related to Sharkord's behavior.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Group
          label="Auto-Join Last Channel"
          description="Automatically rejoin the last text channel on connect."
        >
          <Switch
            checked={autoJoinLastChannel}
            onCheckedChange={(value) => setAutoJoinLastChannel(value)}
          />
        </Group>
        <Group
          label="Chat Input Max Height"
          description="Maximum height of the chat input as a percentage of the window height."
        >
          <div className="flex items-center gap-3 max-w-[400px]">
            <Slider
              min={2}
              max={80}
              step={1}
              value={[chatInputMaxHeightVh]}
              onValueChange={([value]) => setChatInputMaxHeightVh(value)}
              rightSlot={
                <span className="text-sm text-muted-foreground w-10 text-right shrink-0">
                  {chatInputMaxHeightVh === 2
                    ? 'min'
                    : chatInputMaxHeightVh === 80
                      ? 'max'
                      : `${chatInputMaxHeightVh}%`}
                </span>
              }
            />
          </div>
        </Group>
      </CardContent>
    </Card>
  );
});

export { Others };
