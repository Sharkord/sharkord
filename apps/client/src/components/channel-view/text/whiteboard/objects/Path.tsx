import { type PathLayer } from '@sharkord/shared';
import getStroke from 'perfect-freehand';
import { memo } from 'react';
import { colorToCss, getSvgPathFromStroke } from '../utils';

type PathProps = {
  layer: PathLayer;
  onPointerDown?: (e: React.PointerEvent) => void;
  selectionColor?: string;
};

const Path = memo(({ layer, onPointerDown, selectionColor }: PathProps) => {
  const { x, y, fill, points, strokeSize } = layer;

  const stroke = getStroke(points, {
    size: strokeSize ?? 16,
    thinning: 0.5,
    smoothing: 0.5,
    streamline: 0.5
  });

  const pathData = getSvgPathFromStroke(stroke);

  return (
    <path
      onPointerDown={onPointerDown}
      d={pathData}
      style={{
        transform: `translate(${x}px, ${y}px)`,
        fill: colorToCss(fill),
        stroke: selectionColor || 'transparent',
        strokeWidth: selectionColor ? 1 : 0
      }}
    />
  );
});

export { Path };
