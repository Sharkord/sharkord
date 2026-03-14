import { closeServerScreens } from '@/features/server-screens/actions';
import { useAdminChannelGeneral } from '@/features/server/admin/hooks';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Group,
  Input,
  Switch,
  Textarea
} from '@sharkord/ui';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

type TGeneralProps = {
  channelId: number;
};

const General = memo(({ channelId }: TGeneralProps) => {
  const { t } = useTranslation('settings');
  const { channel, loading, onChange, submit, errors } =
    useAdminChannelGeneral(channelId);

  if (!channel) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('channelInfoTitle')}</CardTitle>
        <CardDescription>{t('channelInfoDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Group label={t('channelNameLabel')}>
          <Input
            value={channel.name}
            onChange={(e) => onChange('name', e.target.value)}
            placeholder={t('channelNamePlaceholder')}
            error={errors.name}
          />
        </Group>

        <Group label={t('channelTopicLabel')}>
          <Textarea
            value={channel.topic ?? ''}
            onChange={(e) => onChange('topic', e.target.value || null)}
            placeholder={t('channelTopicPlaceholder')}
          />
        </Group>

        <Group label={t('privateLabel')} description={t('privateDesc')}>
          <Switch
            checked={channel.private}
            onCheckedChange={(value) => onChange('private', value)}
          />
        </Group>

        <div className="flex justify-end gap-2 pt-4">
          <Button variant="outline" onClick={closeServerScreens}>
            {t('cancel')}
          </Button>
          <Button onClick={submit} disabled={loading}>
            {t('saveChanges')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export { General };
