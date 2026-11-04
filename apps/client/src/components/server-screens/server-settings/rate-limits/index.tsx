import { useSettingsForm } from '@/components/server-screens/settings-shell/use-settings-form';
import { useAdminRateLimits } from '@/features/server/admin/hooks';
import { getTRPCClient } from '@/lib/trpc';
import {
  DEFAULT_RATE_LIMITERS,
  RATE_LIMIT_MIN_GLOBAL_REQUESTS,
  RateLimiter,
  type TRateLimit,
  type TRateLimiters
} from '@sharkord/shared';
import {
  Alert,
  AlertDescription,
  Button,
  Group,
  LoadingCard,
  Separator,
  SettingsSection,
  Switch
} from '@sharkord/ui';
import { AlertCircleIcon } from 'lucide-react';
import { memo, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LoginLockoutInput } from './login-lockout-input';
import { OverrideGroup } from './override-group';
import { RateLimitInput } from './rate-limit-input';

const RATE_LIMITERS = Object.values(RateLimiter);

const RateLimits = memo(() => {
  const { t } = useTranslation('settings');
  const { rateLimits, enabledInConfig, loading } = useAdminRateLimits();

  const onSave = useCallback(async (values: TRateLimiters) => {
    const trpc = getTRPCClient();

    await trpc.others.updateRateLimits.mutate(values);
  }, []);

  const { values, onChange, reset, setValues } = useSettingsForm<TRateLimiters>(
    {
      initialValues: DEFAULT_RATE_LIMITERS,
      onSave,
      successMessage: t('rateLimitsUpdated'),
      errorMessage: t('failedUpdateRateLimits')
    }
  );

  useEffect(() => {
    if (rateLimits) reset(rateLimits);
  }, [rateLimits, reset]);

  const onEnabledChange = useCallback(
    (enabled: boolean) => {
      onChange('enabled', enabled);
    },
    [onChange]
  );

  const onGlobalChange = useCallback(
    (global: TRateLimit) => {
      onChange('global', global);
    },
    [onChange]
  );

  const onOverrideChange = useCallback(
    (rateLimiter: RateLimiter, limit: TRateLimit) => {
      onChange('overrides', { ...values.overrides, [rateLimiter]: limit });
    },
    [onChange, values.overrides]
  );

  const onLoginLockoutChange = useCallback(
    (loginLockout: TRateLimiters['loginLockout']) => {
      onChange('loginLockout', loginLockout);
    },
    [onChange]
  );

  const onResetClick = useCallback(() => {
    setValues(DEFAULT_RATE_LIMITERS);
  }, [setValues]);

  if (loading) {
    return <LoadingCard className="h-[600px]" />;
  }

  const inputsDisabled = !enabledInConfig || !values.enabled;

  return (
    <SettingsSection
      title={t('rateLimitsTitle')}
      description={t('rateLimitsDesc')}
      action={
        <Button
          size="sm"
          variant="outline"
          disabled={!enabledInConfig}
          onClick={onResetClick}
        >
          {t('rateLimitsResetDefaults')}
        </Button>
      }
    >
      {!enabledInConfig && (
        <Alert variant="info" className="py-2">
          <AlertCircleIcon className="h-4 w-4" />
          <AlertDescription className="text-xs">
            {t('rateLimitsDisabledInConfig')}
          </AlertDescription>
        </Alert>
      )}

      <Group label={t('rateLimitsEnabledLabel')}>
        <Switch
          checked={enabledInConfig && values.enabled}
          disabled={!enabledInConfig}
          onCheckedChange={onEnabledChange}
        />
      </Group>

      <Separator />

      <Group
        label={t('rateLimitGlobalLabel')}
        description={t('rateLimitGlobalDesc')}
      >
        <RateLimitInput
          value={values.global}
          minRequests={RATE_LIMIT_MIN_GLOBAL_REQUESTS}
          disabled={inputsDisabled}
          onChange={onGlobalChange}
        />
      </Group>

      <Separator />

      {RATE_LIMITERS.map((rateLimiter) => (
        <OverrideGroup
          key={rateLimiter}
          rateLimiter={rateLimiter}
          value={values.overrides[rateLimiter]}
          disabled={inputsDisabled}
          onChange={onOverrideChange}
        />
      ))}

      <Separator />

      <Group label={t('loginLockoutLabel')} description={t('loginLockoutDesc')}>
        <LoginLockoutInput
          value={values.loginLockout}
          disabled={inputsDisabled}
          onChange={onLoginLockoutChange}
        />
      </Group>
    </SettingsSection>
  );
});

export { RateLimits };
