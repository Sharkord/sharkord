import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { useHotkeyState } from '@/hooks/use-hotkeys';
import { hotkeys } from '@/lib/hotkeys/dispatcher';
import type { THotkeyStatus } from '@/lib/hotkeys/types';
import { Badge, Button, Group, Input, Separator, Switch } from '@sharkord/ui';
import { memo, useCallback, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { BridgeIntro } from './bridge-intro';
import type { THotkeysOnChange, THotkeysValues } from './types';

const STATUS_VARIANTS = {
  connected: 'default',
  connecting: 'secondary',
  disconnected: 'outline',
  failed: 'destructive'
} as const satisfies Record<
  THotkeyStatus,
  'default' | 'secondary' | 'outline' | 'destructive'
>;

type TBridgeSettingsProps = {
  values: THotkeysValues;
  onChange: THotkeysOnChange;
};

const BridgeSettings = memo(({ values, onChange }: TBridgeSettingsProps) => {
  const { t } = useTranslation('settings');
  const { status } = useHotkeyState();

  const statusLabels: Record<THotkeyStatus, string> = {
    connected: t('hotkeysBridgeConnected'),
    connecting: t('hotkeysBridgeConnecting'),
    disconnected: t('hotkeysBridgeDisconnected'),
    failed: t('hotkeysBridgeFailed')
  };

  const handleEnabledChange = useCallback(
    (enabled: boolean) => onChange('enabled', enabled),
    [onChange]
  );

  const handleReconnect = useCallback(() => {
    hotkeys.reconnect();
  }, []);

  const handleTokenChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      onChange('token', event.target.value),
    [onChange]
  );

  return (
    <SettingsSection
      title={t('hotkeysBridgeTitle')}
      description={t('hotkeysIntroSummary')}
      action={<Badge variant="secondary">{t('hotkeysIntroBadge')}</Badge>}
    >
      <BridgeIntro />

      <Separator />

      <Group
        label={t('hotkeysEnableLabel')}
        description={t('hotkeysEnableDesc')}
      >
        <Switch
          checked={values.enabled}
          onCheckedChange={handleEnabledChange}
        />
      </Group>

      {values.enabled && (
        <>
          <Group label={t('hotkeysBridgeStatusLabel')}>
            <div className="flex items-center gap-3">
              <Badge variant={STATUS_VARIANTS[status]}>
                {statusLabels[status]}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                disabled={status === 'connected' || status === 'connecting'}
                onClick={handleReconnect}
              >
                {t('hotkeysBridgeRetry')}
              </Button>
            </div>
          </Group>

          <Group
            label={t('hotkeysBridgeTokenLabel')}
            description={t('hotkeysBridgeTokenDesc')}
          >
            <Input
              type="password"
              autoComplete="off"
              className="w-92"
              value={values.token}
              placeholder={t('hotkeysBridgeTokenPlaceholder')}
              onChange={handleTokenChange}
            />
          </Group>
        </>
      )}
    </SettingsSection>
  );
});

export { BridgeSettings };
