import { cn } from '@/lib/utils';
import { Tooltip } from '@sharkord/ui';
import { Info } from 'lucide-react';
import { memo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import {
  formatAxisTime,
  getChartScale,
  getGapIndexes,
  getLatestValue
} from './helpers';
import { tooltipPlugin } from './tooltip-plugin';

type TMetricChartProps = {
  label: string;
  hint?: string;
  timestamps: number[];
  values: (number | null)[];
  rangeMs: number;
  max?: number;
  incrs?: number[];
  className?: string;
  format: (value: number) => string;
};

const AXIS_LABEL_GAP = 16;
const AXIS_FONT = '12px system-ui, sans-serif';

const CHART_HEIGHT = 160;
const X_AXIS_SIZE = 32;
const X_AXIS_SPACE = 80;
const SYNC_KEY = 'metrics';

const readCssVar = (name: string) => {
  const styles = getComputedStyle(document.documentElement);
  const value = styles.getPropertyValue(name);

  return value.trim();
};

let measureContext: CanvasRenderingContext2D | null = null;

const getMeasureContext = () => {
  if (!measureContext) {
    const canvas = document.createElement('canvas');

    measureContext = canvas.getContext('2d');
  }

  return measureContext;
};

const getAxisSize = (_u: uPlot, values: string[] | null) => {
  const context = getMeasureContext();

  if (!context || !values) return AXIS_LABEL_GAP;

  context.font = AXIS_FONT;

  const widths = values.map((value) => {
    const { width } = context.measureText(value);

    return width;
  });

  return Math.ceil(Math.max(0, ...widths)) + AXIS_LABEL_GAP;
};

const refineGaps: uPlot.Series.GapsRefiner = (
  u,
  _seriesIdx,
  idx0,
  idx1,
  nullGaps
) => {
  const [timestamps] = u.data;
  const timeGaps: uPlot.Series.Gaps = [];

  for (const index of getGapIndexes(timestamps)) {
    if (index <= idx0 || index > idx1) continue;

    timeGaps.push([
      Math.round(u.valToPos(timestamps[index - 1]!, 'x', true)),
      Math.round(u.valToPos(timestamps[index]!, 'x', true))
    ]);
  }

  if (timeGaps.length === 0) return nullGaps;

  return [...nullGaps, ...timeGaps].sort(([a], [b]) => a - b);
};

const MetricChart = memo(
  ({
    label,
    hint,
    timestamps,
    values,
    rangeMs,
    max,
    incrs,
    className,
    format
  }: TMetricChartProps) => {
    const { t } = useTranslation('settings');
    const containerRef = useRef<HTMLDivElement>(null);
    const chartRef = useRef<uPlot | null>(null);
    const formatRef = useRef(format);
    const rangeRef = useRef(rangeMs);
    const maxRef = useRef(max);
    const latest = getLatestValue(values);

    formatRef.current = format;
    rangeRef.current = rangeMs;
    maxRef.current = max;

    useEffect(() => {
      const container = containerRef.current;

      if (!container) return;

      const color = readCssVar('--chart-1');
      const axisColor = readCssVar('--muted-foreground');
      const gridColor = readCssVar('--border');
      const getFormat = () => formatRef.current;

      const axis = {
        font: AXIS_FONT,
        stroke: axisColor,
        grid: { stroke: gridColor, width: 1 },
        ticks: { stroke: gridColor, width: 1 }
      };

      const chart = new uPlot(
        {
          width: container.clientWidth,
          height: CHART_HEIGHT,
          legend: { show: false },
          cursor: {
            sync: { key: SYNC_KEY },
            drag: { x: false, y: false },
            points: { size: 6, fill: color }
          },
          scales: {
            x: {
              time: true,
              range: (u) => {
                const [timestamps] = u.data;
                const end =
                  timestamps[timestamps.length - 1] ?? Date.now() / 1000;

                return [end - rangeRef.current / 1000, end];
              }
            },
            y: {
              range: (_u, _min, dataMax) => [
                0,
                maxRef.current ?? getChartScale(dataMax)
              ]
            }
          },
          axes: [
            {
              ...axis,
              size: X_AXIS_SIZE,
              space: X_AXIS_SPACE,
              values: (_u, splits) =>
                splits.map((split) =>
                  formatAxisTime(split * 1000, rangeRef.current)
                )
            },
            {
              ...axis,
              size: getAxisSize,
              incrs,
              values: (_u, splits) => {
                const format = getFormat();

                return splits.map((split) => format(split));
              }
            }
          ],
          series: [
            {},
            {
              stroke: color,
              width: 2,
              gaps: refineGaps,
              fill: `color-mix(in srgb, ${color} 15%, transparent)`,
              points: { show: false }
            }
          ],
          plugins: [tooltipPlugin(getFormat)]
        },
        [[], []],
        container
      );

      const observer = new ResizeObserver(() => {
        chart.setSize({ width: container.clientWidth, height: CHART_HEIGHT });
      });

      observer.observe(container);
      chartRef.current = chart;

      return () => {
        observer.disconnect();
        chart.destroy();
        chartRef.current = null;
      };
    }, [incrs]);

    useEffect(() => {
      const chart = chartRef.current;

      if (!chart) return;

      chart.setData([timestamps, values]);
    }, [timestamps, values, rangeMs, max]);

    return (
      <div className={cn('rounded-lg border bg-muted/30 p-4', className)}>
        <div className="mb-2 flex items-baseline justify-between gap-2">
          <span className="flex items-center gap-1 text-sm font-medium text-muted-foreground">
            {label}
            {hint && (
              <Tooltip content={hint}>
                <Info className="size-3.5" />
              </Tooltip>
            )}
          </span>
          <span className="text-lg font-semibold">
            {latest === undefined ? t('metricsNoData') : format(latest)}
          </span>
        </div>
        <div ref={containerRef} className="relative w-full" />
      </div>
    );
  }
);

export { MetricChart };
