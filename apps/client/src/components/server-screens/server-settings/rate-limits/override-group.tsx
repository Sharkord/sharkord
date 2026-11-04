import { RateLimiter, type TRateLimit } from '@sharkord/shared';
import { Group } from '@sharkord/ui';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { RateLimitInput } from './rate-limit-input';

const OVERRIDE_KEYS: Record<RateLimiter, { label: string; desc: string }> = {
  [RateLimiter.LOGIN]: {
    label: 'rateLimitLoginLabel',
    desc: 'rateLimitLoginDesc'
  },
  [RateLimiter.JOIN_SERVER]: {
    label: 'rateLimitJoinServerLabel',
    desc: 'rateLimitJoinServerDesc'
  },
  [RateLimiter.USE_SECRET_TOKEN]: {
    label: 'rateLimitUseSecretTokenLabel',
    desc: 'rateLimitUseSecretTokenDesc'
  },
  [RateLimiter.PASSWORD]: {
    label: 'rateLimitPasswordLabel',
    desc: 'rateLimitPasswordDesc'
  },
  [RateLimiter.SEND_MESSAGE]: {
    label: 'rateLimitSendMessageLabel',
    desc: 'rateLimitSendMessageDesc'
  },
  [RateLimiter.SEARCH]: {
    label: 'rateLimitSearchLabel',
    desc: 'rateLimitSearchDesc'
  },
  [RateLimiter.SIGNAL_TYPING]: {
    label: 'rateLimitSignalTypingLabel',
    desc: 'rateLimitSignalTypingDesc'
  },
  [RateLimiter.JOIN_VOICE_CHANNEL]: {
    label: 'rateLimitJoinVoiceChannelLabel',
    desc: 'rateLimitJoinVoiceChannelDesc'
  },
  [RateLimiter.VOICE_REACTION]: {
    label: 'rateLimitVoiceReactionLabel',
    desc: 'rateLimitVoiceReactionDesc'
  },
  [RateLimiter.VOICE_STATE]: {
    label: 'rateLimitVoiceStateLabel',
    desc: 'rateLimitVoiceStateDesc'
  },
  [RateLimiter.VOICE_STREAM]: {
    label: 'rateLimitVoiceStreamLabel',
    desc: 'rateLimitVoiceStreamDesc'
  }
};

type TOverrideGroupProps = {
  rateLimiter: RateLimiter;
  value: TRateLimit;
  disabled: boolean;
  onChange: (rateLimiter: RateLimiter, value: TRateLimit) => void;
};

const OverrideGroup = memo(
  ({ rateLimiter, value, disabled, onChange }: TOverrideGroupProps) => {
    const { t } = useTranslation('settings');
    const { label, desc } = OVERRIDE_KEYS[rateLimiter];

    const onValueChange = useCallback(
      (nextValue: TRateLimit) => {
        onChange(rateLimiter, nextValue);
      },
      [rateLimiter, onChange]
    );

    return (
      <Group label={t(label)} description={t(desc)}>
        <RateLimitInput
          value={value}
          disabled={disabled}
          onChange={onValueChange}
        />
      </Group>
    );
  }
);

export { OverrideGroup };
