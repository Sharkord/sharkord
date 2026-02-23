import { setAutoJoinLastChannel } from '@/features/app/actions';
import { useAutoJoinLastChannel } from '@/features/app/hooks';
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
          description="When enabled, Sharkord will automatically select the last text channel you were in when you connect to the server."
        >
          <Switch
            checked={autoJoinLastChannel}
            onCheckedChange={(value) => setAutoJoinLastChannel(value)}
          />
        </Group>
      </CardContent>
    </Card>
  );
});

export { Others };
