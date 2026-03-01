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

const PEAK_HOLD_MS = 2500;
const PEAK_DECAY_PER_MS = 0.22;

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
    const [peakLevel, setPeakLevel] = useState(0);
    const animationFrameRef = useRef<number | null>(null);
    const lastRoundedLevelRef = useRef(Math.round(getAudioLevelSnapshot()));
    const lastRoundedPeakLevelRef = useRef(0);
    const smoothedLevelRef = useRef(getAudioLevelSnapshot());
    const peakLevelRef = useRef(0);
    const peakHoldUntilRef = useRef(0);
    const lastFrameTimeRef = useRef<number | null>(null);

    useEffect(() => {
      const syncFromSnapshot = () => {
        const nextLevel = getAudioLevelSnapshot();
        const rounded = Math.round(nextLevel);

        smoothedLevelRef.current = nextLevel;
        peakLevelRef.current = nextLevel;
        lastRoundedPeakLevelRef.current = Math.round(nextLevel);
        peakHoldUntilRef.current = 0;
        lastFrameTimeRef.current = null;
        lastRoundedLevelRef.current = rounded;
        setAudioLevel(nextLevel);
        setPeakLevel(nextLevel);
      };

      if (!isTesting) {
        syncFromSnapshot();
        return;
      }

      const update = (frameTime: number) => {
        const targetLevel = getAudioLevelSnapshot();
        const currentLevel = smoothedLevelRef.current;
        const smoothingFactor = targetLevel > currentLevel ? 0.5 : 0.22;
        const nextLevel =
          currentLevel + (targetLevel - currentLevel) * smoothingFactor;
        const snappedLevel =
          Math.abs(targetLevel - nextLevel) < 0.1 ? targetLevel : nextLevel;
        const rounded = Math.round(snappedLevel);

        if (rounded !== lastRoundedLevelRef.current) {
          lastRoundedLevelRef.current = rounded;
          setAudioLevel(snappedLevel);
        }

        smoothedLevelRef.current = snappedLevel;

        const previousFrameTime = lastFrameTimeRef.current ?? frameTime;
        const deltaMs = Math.max(0, frameTime - previousFrameTime);
        lastFrameTimeRef.current = frameTime;

        let nextPeakLevel = peakLevelRef.current;

        // Peak marker tracks the raw meter value; the filled bar is the smoothed display.
        if (targetLevel >= nextPeakLevel) {
          nextPeakLevel = targetLevel;
          peakHoldUntilRef.current = frameTime + PEAK_HOLD_MS;
        } else if (frameTime > peakHoldUntilRef.current) {
          nextPeakLevel = Math.max(
            snappedLevel,
            nextPeakLevel - deltaMs * PEAK_DECAY_PER_MS
          );
        }

        peakLevelRef.current = nextPeakLevel;

        const roundedPeak = Math.round(nextPeakLevel);

        if (roundedPeak !== lastRoundedPeakLevelRef.current) {
          lastRoundedPeakLevelRef.current = roundedPeak;
          setPeakLevel(nextPeakLevel);
        }

        animationFrameRef.current = requestAnimationFrame(update);
      };

      animationFrameRef.current = requestAnimationFrame(update);

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
    const noiseGateThresholdPercent =
      microphoneDecibelsToPercent(clampedThresholdDb);

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
              className={`absolute inset-y-0 left-0 ${meterFillColorClass} transition-[background-color] duration-75`}
              style={{ width: `${audioLevel}%` }}
            />

            <div
              className="absolute inset-y-0 w-[2px] -translate-x-1/2 rounded-full bg-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.25)]"
              style={{ left: `${peakLevel}%` }}
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

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{MICROPHONE_LEVEL_METER_MIN_DB} dB</span>
          {noiseGateEnabled ? (
            <span>Gate: {clampedThresholdDb} dB</span>
          ) : (
            <span />
          )}
          <span>{MICROPHONE_LEVEL_METER_MAX_DB} dB</span>
        </div>
      </div>
    );
  }
);
MicrophoneTestLevelBar.displayName = 'MicrophoneTestLevelBar';

export { MicrophoneTestLevelBar };
