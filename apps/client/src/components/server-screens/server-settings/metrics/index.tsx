import { useAdminMetrics } from '@/features/server/admin/hooks';
import { useCan } from '@/features/server/hooks';
import { getTRPCClient } from '@/lib/trpc';
import {
  getTrpcError,
  METRICS_RANGE_MS,
  MetricsRange,
  Permission
} from '@sharkord/shared';
import {
  Group,
  LoadingCard,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SettingsSection,
  Switch
} from '@sharkord/ui';
import { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  BYTE_INCRS,
  COUNT_INCRS,
  formatBytes,
  formatBytesPerSecond,
  formatCount,
  formatMilliseconds,
  formatPercent,
  getRangeTotal
} from './helpers';
import { MetricChart } from './metric-chart';
import { MetricStat } from './metric-stat';

const RANGE_LABEL_KEYS = {
  [MetricsRange.FIVE_MINUTES]: 'metricsRange5m',
  [MetricsRange.FIFTEEN_MINUTES]: 'metricsRange15m',
  [MetricsRange.ONE_HOUR]: 'metricsRange1h',
  [MetricsRange.SIX_HOURS]: 'metricsRange6h',
  [MetricsRange.TWENTY_FOUR_HOURS]: 'metricsRange24h',
  [MetricsRange.SEVEN_DAYS]: 'metricsRange7d',
  [MetricsRange.THIRTY_DAYS]: 'metricsRange30d'
} as const;

const RANGES = Object.values(MetricsRange);

const Metrics = memo(() => {
  const { t } = useTranslation('settings');
  const [range, setRange] = useState(MetricsRange.FIVE_MINUTES);
  const { enabled, samples, workerMemoryIsPeak, loading, refetch } =
    useAdminMetrics(range);
  const can = useCan();
  const canManageSettings = can(Permission.MANAGE_SETTINGS);
  const rangeMs = METRICS_RANGE_MS[range];

  const handleEnabledChange = useCallback(
    async (checked: boolean) => {
      try {
        const trpc = getTRPCClient();

        await trpc.others.updateSettings.mutate({
          metricsEnabled: checked
        });
        await refetch();
      } catch (error) {
        toast.error(getTrpcError(error, t('failedUpdateMetrics')));
      }
    },
    [refetch, t]
  );

  const handleRangeChange = useCallback((value: string) => {
    setRange(value as MetricsRange);
  }, []);

  const series = useMemo(() => {
    const latest = samples[samples.length - 1];

    return {
      timestamps: samples.map(({ timestamp }) => timestamp / 1000),
      systemCpu: samples.map(({ systemCpu }) => systemCpu),
      systemMemory: samples.map(({ systemMemoryUsed }) => systemMemoryUsed),
      systemMemoryTotal: latest?.systemMemoryTotal,
      cpu: samples.map(({ cpu }) => cpu),
      memory: samples.map(({ memory }) => memory),
      workerCpu: samples.map(({ workerCpu }) => workerCpu),
      workerMemory: samples.map(({ workerMemory }) => workerMemory),
      eventLoopLag: samples.map(({ eventLoopLag }) => eventLoopLag),
      voiceRx: samples.map(({ voiceRx }) => voiceRx),
      voiceTx: samples.map(({ voiceTx }) => voiceTx),
      onlineUsers: samples.map(({ onlineUsers }) => onlineUsers),
      voiceUsers: samples.map(({ voiceUsers }) => voiceUsers),
      voiceProducers: samples.map(({ voiceProducers }) => voiceProducers),
      voiceConsumers: samples.map(({ voiceConsumers }) => voiceConsumers)
    };
  }, [samples]);

  let workerMemoryLabel = t('metricsMemory');
  let workerMemoryHint: string | undefined;

  if (workerMemoryIsPeak) {
    workerMemoryLabel = t('metricsPeakMemory');
    workerMemoryHint = t('metricsPeakMemoryHint');
  }

  const voiceTotals = useMemo(
    () => ({
      received: formatBytes(getRangeTotal(series.timestamps, series.voiceRx)),
      sent: formatBytes(getRangeTotal(series.timestamps, series.voiceTx))
    }),
    [series]
  );

  const rangeSelect = useMemo(
    () => (
      <Select value={range} onValueChange={handleRangeChange}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {RANGES.map((value) => (
              <SelectItem key={value} value={value}>
                {t(RANGE_LABEL_KEYS[value])}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    ),
    [t, range, handleRangeChange]
  );

  if (loading) {
    return <LoadingCard className="h-[600px]" />;
  }

  return (
    <div className="space-y-4">
      <SettingsSection title={t('metricsTitle')} description={t('metricsDesc')}>
        <Group
          label={t('metricsEnabledLabel')}
          description={t('metricsEnabledDesc')}
        >
          <Switch
            checked={enabled}
            disabled={!canManageSettings}
            onCheckedChange={handleEnabledChange}
          />
        </Group>
      </SettingsSection>
      {enabled && (
        <>
          <SettingsSection
            title={t('metricsSystemTitle')}
            description={t('metricsSystemDesc')}
            action={rangeSelect}
          >
            <div className="grid gap-4 xl:grid-cols-2">
              <MetricChart
                label={t('metricsCpu')}
                timestamps={series.timestamps}
                values={series.systemCpu}
                rangeMs={rangeMs}
                max={100}
                format={formatPercent}
              />
              <MetricChart
                label={t('metricsMemory')}
                timestamps={series.timestamps}
                values={series.systemMemory}
                rangeMs={rangeMs}
                max={series.systemMemoryTotal}
                incrs={BYTE_INCRS}
                format={formatBytes}
              />
            </div>
          </SettingsSection>
          <SettingsSection
            title={t('metricsServerTitle')}
            description={t('metricsServerDesc')}
          >
            <div className="grid gap-4 xl:grid-cols-2">
              <MetricChart
                label={t('metricsCpu')}
                timestamps={series.timestamps}
                values={series.cpu}
                rangeMs={rangeMs}
                max={100}
                format={formatPercent}
              />
              <MetricChart
                label={t('metricsMemory')}
                timestamps={series.timestamps}
                values={series.memory}
                rangeMs={rangeMs}
                incrs={BYTE_INCRS}
                format={formatBytes}
              />
              <MetricChart
                label={t('metricsEventLoopLag')}
                timestamps={series.timestamps}
                values={series.eventLoopLag}
                rangeMs={rangeMs}
                className="xl:col-span-2"
                format={formatMilliseconds}
              />
            </div>
          </SettingsSection>
          <SettingsSection
            title={t('metricsWorkerTitle')}
            description={t('metricsWorkerDesc')}
          >
            <div className="grid gap-4 xl:grid-cols-2">
              <MetricChart
                label={t('metricsCpu')}
                timestamps={series.timestamps}
                values={series.workerCpu}
                rangeMs={rangeMs}
                max={100}
                format={formatPercent}
              />
              <MetricChart
                label={workerMemoryLabel}
                hint={workerMemoryHint}
                timestamps={series.timestamps}
                values={series.workerMemory}
                rangeMs={rangeMs}
                incrs={BYTE_INCRS}
                format={formatBytes}
              />
              <MetricChart
                label={t('metricsVoiceReceived')}
                timestamps={series.timestamps}
                values={series.voiceRx}
                rangeMs={rangeMs}
                incrs={BYTE_INCRS}
                format={formatBytesPerSecond}
              />
              <MetricChart
                label={t('metricsVoiceSent')}
                timestamps={series.timestamps}
                values={series.voiceTx}
                rangeMs={rangeMs}
                incrs={BYTE_INCRS}
                format={formatBytesPerSecond}
              />
              <MetricStat
                label={t('metricsVoiceReceivedTotal')}
                value={voiceTotals.received}
              />
              <MetricStat
                label={t('metricsVoiceSentTotal')}
                value={voiceTotals.sent}
              />
            </div>
          </SettingsSection>
          <SettingsSection
            title={t('metricsActivityTitle')}
            description={t('metricsActivityDesc')}
          >
            <div className="grid gap-4 xl:grid-cols-2">
              <MetricChart
                label={t('metricsOnlineUsers')}
                timestamps={series.timestamps}
                values={series.onlineUsers}
                rangeMs={rangeMs}
                incrs={COUNT_INCRS}
                format={formatCount}
              />
              <MetricChart
                label={t('metricsVoiceUsers')}
                timestamps={series.timestamps}
                values={series.voiceUsers}
                rangeMs={rangeMs}
                incrs={COUNT_INCRS}
                format={formatCount}
              />
              <MetricChart
                label={t('metricsStreamsReceived')}
                timestamps={series.timestamps}
                values={series.voiceProducers}
                rangeMs={rangeMs}
                incrs={COUNT_INCRS}
                format={formatCount}
              />
              <MetricChart
                label={t('metricsStreamsSent')}
                timestamps={series.timestamps}
                values={series.voiceConsumers}
                rangeMs={rangeMs}
                incrs={COUNT_INCRS}
                format={formatCount}
              />
            </div>
          </SettingsSection>
        </>
      )}
    </div>
  );
});

export { Metrics };
