import { LanguageSwitcher } from '@/components/language-switcher';
import {
  setAutoJoinLastChannel,
  setChatInputMaxHeightVh
} from '@/features/app/actions';
import {
  useAutoJoinLastChannel,
  useChatInputMaxHeightVh
} from '@/features/app/hooks';
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
import { useTranslation } from 'react-i18next';

const Others = memo(() => {
  const { t } = useTranslation('settings');
  const autoJoinLastChannel = useAutoJoinLastChannel();
  const chatInputMaxHeightVh = useChatInputMaxHeightVh();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('othersTitle')}</CardTitle>
        <CardDescription>{t('othersDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Group
          label={t('autoJoinLastChannelLabel')}
          description={t('autoJoinLastChannelDesc')}
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
        <Group label={t('languageLabel')} description={t('languageDesc')}>
          <LanguageSwitcher />
        </Group>
      </CardContent>
    </Card>
  );
});

export { Others };
