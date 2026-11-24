import type {
  ScreenShareLayerStats,
  ScreenShareStats
} from '@/components/voice-provider/hooks/use-transport-stats';
import { formatBigNumber } from '@/helpers/format-big-number';
import { ChevronDown, ChevronRight, MonitorUp } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  formatRate,
  getCodecLabel,
  getEncoderKind,
  type TEncoderKind
} from './helpers';
import { StatsRow, StatsSection, type TStatTone } from './parts';

const ENCODER_LABEL_KEYS: Record<TEncoderKind, string> = {
  gpu: 'gpuEncoder',
  cpu: 'cpuEncoder',
  unknown: 'unknownEncoder'
};

const ENCODER_TONES: Record<TEncoderKind, TStatTone> = {
  gpu: 'good',
  cpu: 'warn',
  unknown: 'default'
};

type TSimulcastLayerProps = {
  layer: ScreenShareLayerStats;
  index: number;
};

const SimulcastLayer = memo(({ layer, index }: TSimulcastLayerProps) => {
  const { t } = useTranslation('sidebar');

  let title = t('simulcastLayer', { layer: layer.rid || index + 1 });

  if (layer.codec) {
    title = `${title} · ${getCodecLabel(layer.codec)}`;
  }

  return (
    <div className="space-y-1 border-t border-border/50 pt-1.5">
      <div className="text-xs font-medium text-foreground">{title}</div>
      <StatsRow
        label={t('resolution')}
        value={`${layer.width}x${layer.height}`}
      />
      <StatsRow
        label={t('frameRate')}
        value={`${Math.round(layer.frameRate)} fps`}
      />
      <StatsRow label={t('bitrate')} value={formatRate(layer.bitrate)} />
      <StatsRow
        label={t('packets')}
        value={formatBigNumber(layer.packetsSent)}
      />
      {layer.qualityLimitationReason !== 'none' && (
        <StatsRow
          label={t('qualityLimited')}
          value={layer.qualityLimitationReason}
          tone="warn"
        />
      )}
    </div>
  );
});

type TScreenShareStatsProps = {
  screenShare: ScreenShareStats;
};

export const ScreenShareStatsSection = memo(
  ({ screenShare }: TScreenShareStatsProps) => {
    const { t } = useTranslation('sidebar');
    const [showLayers, setShowLayers] = useState(false);
    const { encoderImplementation, codec, layers } = screenShare;
    const hasLayers = screenShare.simulcast && layers.length > 1;
    const LayersIcon = showLayers ? ChevronDown : ChevronRight;

    const handleToggleLayers = useCallback(() => {
      setShowLayers((show) => !show);
    }, []);

    let encoderKind: TEncoderKind | undefined;

    if (encoderImplementation) {
      encoderKind = getEncoderKind(encoderImplementation);
    }

    return (
      <StatsSection title={t('screenShare')} icon={MonitorUp}>
        {codec && <StatsRow label={t('codec')} value={getCodecLabel(codec)} />}
        {encoderKind && (
          <StatsRow
            label={t('encoder')}
            value={t(ENCODER_LABEL_KEYS[encoderKind], {
              encoder: encoderImplementation
            })}
            tone={ENCODER_TONES[encoderKind]}
          />
        )}
        <StatsRow
          label={t('resolution')}
          value={`${screenShare.width}x${screenShare.height}`}
        />
        <StatsRow
          label={t('frameRate')}
          value={`${Math.round(screenShare.frameRate)} fps`}
        />
        <StatsRow
          label={t('bitrate')}
          value={formatRate(screenShare.bitrate)}
        />
        <StatsRow
          label={t('framesEncoded')}
          value={formatBigNumber(screenShare.framesEncoded)}
        />
        {screenShare.qualityLimitationReason !== 'none' && (
          <StatsRow
            label={t('qualityLimited')}
            value={screenShare.qualityLimitationReason}
            tone="warn"
          />
        )}
        {hasLayers && (
          <>
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleToggleLayers}
            >
              <span className="flex items-center gap-1">
                <LayersIcon className="h-3.5 w-3.5" />
                {t('simulcastLayers')}
              </span>
              <span className="tabular-nums text-foreground">
                {layers.length}
              </span>
            </button>
            {showLayers &&
              layers.map((layer, index) => (
                <SimulcastLayer key={layer.id} layer={layer} index={index} />
              ))}
          </>
        )}
      </StatsSection>
    );
  }
);
