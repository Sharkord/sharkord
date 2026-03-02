import { type EllipseLayer } from '@sharkord/shared';
import { memo } from 'react';
import { colorToCss } from '../utils';

type EllipseProps = {
  layer: EllipseLayer;
  onPointerDown?: (e: React.PointerEvent) => void;
  selectionColor?: string;
};

const Ellipse = memo(
  ({ layer, onPointerDown, selectionColor }: EllipseProps) => {
    const { x, y, width, height, fill } = layer;

    return (
      <ellipse
        onPointerDown={onPointerDown}
        cx={width / 2}
        cy={height / 2}
        rx={width / 2}
        ry={height / 2}
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

export { Ellipse };
