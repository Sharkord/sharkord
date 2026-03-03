import { type ArrowLayer } from '@sharkord/shared';
import { memo } from 'react';
import { colorToCss } from '../utils';

type ArrowProps = {
  layer: ArrowLayer;
  onPointerDown?: (e: React.PointerEvent) => void;
  selectionColor?: string;
};

const ARROW_HEAD_SIZE = 12;

const Arrow = memo(({ layer, onPointerDown, selectionColor }: ArrowProps) => {
  const { x, y, x2, y2, fill } = layer;
  const color = selectionColor || colorToCss(fill);

  // Calculate arrowhead points
  const angle = Math.atan2(y2 - y, x2 - x);
  const ax1 = x2 - ARROW_HEAD_SIZE * Math.cos(angle - Math.PI / 6);
  const ay1 = y2 - ARROW_HEAD_SIZE * Math.sin(angle - Math.PI / 6);
  const ax2 = x2 - ARROW_HEAD_SIZE * Math.cos(angle + Math.PI / 6);
  const ay2 = y2 - ARROW_HEAD_SIZE * Math.sin(angle + Math.PI / 6);

  return (
    <>
      {/* Wider invisible hit area */}
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
          stroke: color,
          strokeWidth: 3,
          strokeLinecap: 'round'
        }}
        pointerEvents="none"
      />
      {/* Arrowhead */}
      <polygon
        points={`${x2},${y2} ${ax1},${ay1} ${ax2},${ay2}`}
        fill={color}
        pointerEvents="none"
      />
    </>
  );
});

export { Arrow };
