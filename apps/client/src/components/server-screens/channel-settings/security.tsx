import { getTRPCClient } from '@/lib/trpc';
import { getTrpcError } from '@sharkord/shared';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Group
} from '@sharkord/ui';
import { memo, useCallback } from 'react';
import { toast } from 'sonner';

type TSecurityProps = {
  channelId: number;
};

const Security = memo(({ channelId }: TSecurityProps) => {
  const onRotateToken = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      await trpc.channels.rotateFileAccessToken.mutate({ channelId });

      toast.success('File access token rotated successfully');
    } catch (error) {
      toast.error(getTrpcError(error, 'Failed to rotate file access token'));
    }
  }, [channelId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security</CardTitle>
        <CardDescription>
          Manage some security settings for this channel
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Group label="File Access Token" help="Only used for private channels">
          <p className="text-sm text-muted-foreground">
            The file access token is used to secure access to files in this
            channel. Rotating the token will invalidate all existing file links.
            This means that ALL previously shared files will no longer be
            accessible.
          </p>
          <Button variant="destructive" onClick={onRotateToken}>
            Rotate Token
          </Button>
        </Group>
      </CardContent>
    </Card>
  );
});

export { Security };
