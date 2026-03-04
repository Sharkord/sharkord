import {
  setBrowserNotifications,
  setBrowserNotificationsForDms,
  setBrowserNotificationsForMentions
} from '@/features/app/actions';
import {
  useBrowserNotifications,
  useBrowserNotificationsForDms,
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

const Notifications = memo(() => {
  const browserNotifications = useBrowserNotifications();
  const browserNotificationsForMentions = useBrowserNotificationsForMentions();
  const browserNotificationsForDms = useBrowserNotificationsForDms();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          Control when browser notifications are sent.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Group
          label="All Messages"
          description="Send a notification for every new message."
        >
          <Switch
            checked={browserNotifications}
            onCheckedChange={(value) => setBrowserNotifications(value)}
          />
        </Group>
        <Group
          label="Mentions Only"
          description="Send a notification only when mentioned. Ignored if 'All Messages' is enabled."
        >
          <Switch
            checked={browserNotificationsForMentions}
            onCheckedChange={(value) =>
              setBrowserNotificationsForMentions(value)
            }
          />
        </Group>
        <Group
          label="Direct Messages"
          description="Send a notification for every new direct message."
        >
          <Switch
            checked={browserNotificationsForDms}
            onCheckedChange={(value) => setBrowserNotificationsForDms(value)}
          />
        </Group>
      </CardContent>
    </Card>
  );
});

export { Notifications };
