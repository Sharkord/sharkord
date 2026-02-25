import {
  MICROPHONE_GATE_DEFAULT_THRESHOLD_DB,
  MICROPHONE_LEVEL_METER_MAX_DB,
  MICROPHONE_LEVEL_METER_MIN_DB,
  clampMicrophoneDecibels,
  microphoneDecibelsToPercent
} from '@/helpers/audio-gate';
import { Slider } from '@sharkord/ui';
import { memo, useEffect, useRef, useState } from 'react';

type TMicrophoneTestLevelBarProps = {
  isTesting: boolean;
  noiseGateEnabled: boolean;
  noiseGateControlsDisabled?: boolean;
  noiseGateThresholdDb: number | undefined;
  onThresholdChange: (value: number) => void;
  getAudioLevelSnapshot: () => number;
};

const MicrophoneTestLevelBar = memo(
  ({
    isTesting,
    noiseGateEnabled,
    noiseGateControlsDisabled = false,
    noiseGateThresholdDb,
    onThresholdChange,
    getAudioLevelSnapshot
  }: TMicrophoneTestLevelBarProps) => {
    const [audioLevel, setAudioLevel] = useState(() => getAudioLevelSnapshot());
    const animationFrameRef = useRef<number | null>(null);
    const lastRoundedLevelRef = useRef(Math.round(getAudioLevelSnapshot()));

    useEffect(() => {
      const syncFromSnapshot = () => {
        const nextLevel = getAudioLevelSnapshot();
        const rounded = Math.round(nextLevel);

        lastRoundedLevelRef.current = rounded;
        setAudioLevel(nextLevel);
      };

      if (!isTesting) {
        syncFromSnapshot();
        return;
      }

      const update = () => {
        const nextLevel = getAudioLevelSnapshot();
        const rounded = Math.round(nextLevel);

        if (rounded !== lastRoundedLevelRef.current) {
          lastRoundedLevelRef.current = rounded;
          setAudioLevel(nextLevel);
        }

        animationFrameRef.current = requestAnimationFrame(update);
      };

      update();

      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };
    }, [isTesting, getAudioLevelSnapshot]);

    const meterFillColorClass =
      audioLevel >= 66
        ? 'bg-green-600'
        : audioLevel >= 33
          ? 'bg-green-500'
          : 'bg-green-300';
    const clampedThresholdDb = clampMicrophoneDecibels(
      noiseGateThresholdDb ?? MICROPHONE_GATE_DEFAULT_THRESHOLD_DB
    );
    const noiseGateThresholdPercent = microphoneDecibelsToPercent(
      clampedThresholdDb
    );

    return (
      <div className="space-y-2">
        <div className="relative h-3 w-full">
          <div className="absolute inset-0 overflow-hidden rounded-full">
            {noiseGateEnabled ? (
              <div className="absolute inset-0 flex">
                <div
                  className="bg-yellow-200/70"
                  style={{ width: `${noiseGateThresholdPercent}%` }}
                />
                <div className="flex-1 bg-muted" />
              </div>
            ) : (
              <div className="absolute inset-0 bg-muted" />
            )}

            <div
              className={`absolute inset-y-0 left-0 ${meterFillColorClass} transition-[width,background-color] duration-75`}
              style={{ width: `${audioLevel}%` }}
            />
          </div>

          {noiseGateEnabled && (
            <Slider
              aria-label="Noise gate threshold"
              className="absolute inset-0 z-10 [&_[data-slot=slider-track]]:h-full [&_[data-slot=slider-track]]:bg-transparent [&_[data-slot=slider-range]]:bg-transparent [&_[data-slot=slider-thumb]]:size-[26px] [&_[data-slot=slider-thumb]]:border-yellow-500 [&_[data-slot=slider-thumb]]:bg-white [&_[data-slot=slider-thumb]]:shadow-sm"
              min={MICROPHONE_LEVEL_METER_MIN_DB}
              max={MICROPHONE_LEVEL_METER_MAX_DB}
              step={1}
              value={[clampedThresholdDb]}
              disabled={noiseGateControlsDisabled}
              onValueChange={([value]) => onThresholdChange(value)}
            />
          )}
        </div>

        {noiseGateEnabled && (
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{MICROPHONE_LEVEL_METER_MIN_DB} dB</span>
            <span>Gate: {clampedThresholdDb} dB</span>
            <span>{MICROPHONE_LEVEL_METER_MAX_DB} dB</span>
          </div>
        )}
      </div>
    );
  }
);
MicrophoneTestLevelBar.displayName = 'MicrophoneTestLevelBar';

export { MicrophoneTestLevelBar };
