import {
  setAutoJoinLastChannel,
  setBrowserNotifications,
  setBrowserNotificationsForMentions
} from '@/features/app/actions';
import {
  useAutoJoinLastChannel,
  useBrowserNotifications,
  useBrowserNotificationsForMentions
} from '@/features/app/hooks';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Group,
  Switch
} from '@sharkord/ui';
import { memo } from 'react';

const Others = memo(() => {
  const autoJoinLastChannel = useAutoJoinLastChannel();
  const browserNotifications = useBrowserNotifications();
  const browserNotificationsForMentions = useBrowserNotificationsForMentions();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Others</CardTitle>
        <CardDescription>
          In this section, you can update settings related to Sharkord's
          behavior.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Group
          label="Auto-Join Last Channel"
          description="Automatically select the last text channel you were in when you connect to the server."
        >
          <Switch
            checked={autoJoinLastChannel}
            onCheckedChange={(value) => setAutoJoinLastChannel(value)}
          />
        </Group>
        <Group
          label="Browser Notifications"
          // description="When enabled, you will receive browser notifications for new messages."
          description="Recieve browser notifications for all new messages."
        >
          <Switch
            checked={browserNotifications}
            onCheckedChange={(value) => setBrowserNotifications(value)}
          />
        </Group>
        <Group
          label="Notifications for Mentions Only"
          description="Recieve browser notifications for messages that mention you. This setting is ignored if 'Browser Notifications' is enabled."
        >
          <Switch
            checked={browserNotificationsForMentions}
            onCheckedChange={(value) =>
              setBrowserNotificationsForMentions(value)
            }
          />
        </Group>
      </CardContent>
    </Card>
  );
});

export { Others };
