import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Group } from '@/components/ui/group';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';import { useTranslation } from 'react-i18next';import { Textarea } from '@/components/ui/textarea';
import { closeServerScreens } from '@/features/server-screens/actions';
import { useAdminChannelGeneral } from '@/features/server/admin/hooks';
import { memo } from 'react';

type TGeneralProps = {
  channelId: number;
};

const General = memo(({ channelId }: TGeneralProps) => {
  const { t } = useTranslation();
  const { channel, loading, onChange, submit, errors } =
    useAdminChannelGeneral(channelId);

  if (!channel) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Channel Information</CardTitle>
        <CardDescription>
          Manage your channel's basic information
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Group label={t('labels.name')}>
          <Input
            value={channel.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder={t('placeholders.enterServerName')}
            error={errors.name}
          />
        </Group>

        <Group label="Topic">
          <Textarea
            value={channel.topic ?? ''}
            onChange={(e) => onChange('topic', e.target.value || null)}
            placeholder={t('placeholders.enterChannelTopic')}
          />
        </Group>

        <Group
          label={t('labels.private')}
          description="Restricts access to this channel to specific roles and members."
        >
          <Switch
            checked={channel.private}
            onCheckedChange={(value) => onChange('private', value)}
          />
        </Group>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={closeServerScreens}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={loading}>
            Save Changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export { General };
