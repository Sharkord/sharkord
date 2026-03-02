import { type LineLayer } from '@sharkord/shared';
import { memo } from 'react';
import { colorToCss } from '../utils';

type LineProps = {
  layer: LineLayer;
  onPointerDown?: (e: React.PointerEvent) => void;
  selectionColor?: string;
};

const Line = memo(({ layer, onPointerDown, selectionColor }: LineProps) => {
  const { x, y, width, height, fill } = layer;

  return (
    <line
      onPointerDown={onPointerDown}
      x1={0}
      y1={0}
      x2={width}
      y2={height}
      style={{
        transform: `translate(${x}px, ${y}px)`,
        stroke: colorToCss(fill),
        strokeWidth: 3,
        strokeLinecap: 'round'
      }}
      // Invisible wider hit area for selection
      pointerEvents="stroke"
    />
  );
});

export { Line };
