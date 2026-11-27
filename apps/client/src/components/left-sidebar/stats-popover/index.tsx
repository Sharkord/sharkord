import { useDevices } from '@/components/devices-provider/hooks/use-devices';
import { Dialog } from '@/components/dialogs/dialogs';
import { useVoiceStats } from '@/components/voice-provider/stats-context';
import { openDialog } from '@/features/dialogs/actions';
import { formatBigNumber } from '@/helpers/format-big-number';
import { NoiseSuppression } from '@/types';
import {
  IconButton,
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@sharkord/ui';
import { filesize } from 'filesize';
import { ArrowDown, ArrowUp, Mic, Sigma, Stethoscope } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { formatRate } from './helpers';
import { StatsEmpty, StatsRow, StatsSection } from './parts';
import { ScreenShareStatsSection } from './screen-share-stats';

type TStatsPopoverProps = {
  children: React.ReactNode;
};

const NOISE_SUPPRESSION_LABEL_KEYS: Record<NoiseSuppression, string> = {
  [NoiseSuppression.NONE]: 'settings:noiseSuppressionNone',
  [NoiseSuppression.STANDARD]: 'settings:noiseSuppressionStandardName',
  [NoiseSuppression.RNNOISE]: 'settings:noiseSuppressionRnnoiseName',
  [NoiseSuppression.DTLN]: 'settings:noiseSuppressionDtlnName'
};

const StatsContent = memo(() => {
  const { t } = useTranslation('sidebar');
  const {
    producer,
    consumer,
    screenShare,
    totalBytesSent,
    totalBytesReceived,
    currentBitrateSent,
    currentBitrateReceived
  } = useVoiceStats();
  const { devices } = useDevices();
  const hasNoiseSuppression =
    devices.noiseSuppression !== NoiseSuppression.NONE;

  const handleOpenDiagnostics = useCallback(() => {
    openDialog(Dialog.VOICE_DEBUG);
  }, []);

  return (
    <div className="w-80">
      <div className="flex items-center justify-between gap-2 border-b border-border/50 px-3 py-2">
        <h3 className="text-sm font-semibold">{t('transportStats')}</h3>
        <IconButton
          variant="ghost"
          size="sm"
          icon={Stethoscope}
          title={t('voiceDiagnostics')}
          aria-label={t('voiceDiagnostics')}
          onClick={handleOpenDiagnostics}
        />
      </div>
      <div className="space-y-3 p-3">
        <div className="grid grid-cols-2 gap-2">
          <StatsSection title={t('outgoing')} icon={ArrowUp}>
            {producer ? (
              <>
                <StatsRow
                  label={t('rate')}
                  value={formatRate(currentBitrateSent)}
                />
                <StatsRow
                  label={t('packets')}
                  value={formatBigNumber(producer.packetsSent)}
                />
                <StatsRow
                  label={t('rtt')}
                  value={`${producer.rtt.toFixed(1)} ms`}
                />
              </>
            ) : (
              <StatsEmpty>{t('noData')}</StatsEmpty>
            )}
          </StatsSection>
          <StatsSection title={t('incoming')} icon={ArrowDown}>
            {consumer ? (
              <>
                <StatsRow
                  label={t('rate')}
                  value={formatRate(currentBitrateReceived)}
                />
                <StatsRow
                  label={t('packets')}
                  value={formatBigNumber(consumer.packetsReceived)}
                />
                {consumer.packetsLost > 0 && (
                  <StatsRow
                    label={t('packetsLost')}
                    value={formatBigNumber(consumer.packetsLost)}
                    tone="bad"
                  />
                )}
              </>
            ) : (
              <StatsEmpty>{t('noRemoteStreams')}</StatsEmpty>
            )}
          </StatsSection>
        </div>
        {hasNoiseSuppression && (
          <StatsSection title={t('microphone')} icon={Mic}>
            <StatsRow
              label={t('noiseSuppression')}
              value={t(NOISE_SUPPRESSION_LABEL_KEYS[devices.noiseSuppression])}
            />
          </StatsSection>
        )}
        {screenShare && <ScreenShareStatsSection screenShare={screenShare} />}
        <StatsSection title={t('sessionTotals')} icon={Sigma}>
          <StatsRow label={t('outgoing')} value={filesize(totalBytesSent)} />
          <StatsRow
            label={t('incoming')}
            value={filesize(totalBytesReceived)}
          />
        </StatsSection>
      </div>
    </div>
  );
});

export const StatsPopover = memo(({ children }: TStatsPopoverProps) => (
  <Popover>
    <PopoverTrigger asChild>{children}</PopoverTrigger>
    <PopoverContent side="top" align="start" className="w-auto p-0">
      <StatsContent />
    </PopoverContent>
  </Popover>
));
