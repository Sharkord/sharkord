import { type RectangleLayer } from '@sharkord/shared';
import { memo } from 'react';
import { colorToCss } from '../utils';

type RectangleProps = {
  layer: RectangleLayer;
  onPointerDown?: (e: React.PointerEvent) => void;
  selectionColor?: string;
};

const Rectangle = memo(
  ({ layer, onPointerDown, selectionColor }: RectangleProps) => {
    const { x, y, width, height, fill } = layer;

    return (
      <rect
        onPointerDown={onPointerDown}
        x={0}
        y={0}
        width={width}
        height={height}
        style={{
          transform: `translate(${x}px, ${y}px)`,
          fill: colorToCss(fill),
          stroke: selectionColor || 'transparent',
          strokeWidth: selectionColor ? 1 : 0
        }}
      />
    );
  }
);

export { Rectangle };
