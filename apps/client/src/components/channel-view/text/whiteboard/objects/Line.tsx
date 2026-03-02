import { type LineLayer } from '@sharkord/shared';
import { memo } from 'react';
import { colorToCss } from '../utils';

type LineProps = {
  layer: LineLayer;
  onPointerDown?: (e: React.PointerEvent) => void;
  selectionColor?: string;
};

const Line = memo(({ layer, onPointerDown, selectionColor }: LineProps) => {
  const { x, y, x2, y2, fill } = layer;

  return (
    <>
      {/* Wider invisible hit area for easier selection */}
      <line
        x1={x}
        y1={y}
        x2={x2}
        y2={y2}
        stroke="transparent"
        strokeWidth={12}
        onPointerDown={onPointerDown}
      />
      <line
        x1={x}
        y1={y}
        x2={x2}
        y2={y2}
        style={{
          stroke: selectionColor || colorToCss(fill),
          strokeWidth: 3,
          strokeLinecap: 'round'
        }}
        pointerEvents="none"
      />
    </>
  );
});

export { Line };
