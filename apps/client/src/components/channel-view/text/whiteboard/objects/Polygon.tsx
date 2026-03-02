import { type Layer, LayerType } from '@sharkord/shared';
import { memo } from 'react';
import { colorToCss } from '../utils';

type PolygonProps = {
  layer: Layer;
  onPointerDown?: (e: React.PointerEvent) => void;
  selectionColor?: string;
};

function getPolygonPoints(
  type: LayerType,
  width: number,
  height: number
): string {
  switch (type) {
    case LayerType.Triangle:
      return `${width / 2},0 ${width},${height} 0,${height}`;
    case LayerType.Hexagon: {
      const dx = width / 4;
      return `${dx},0 ${width - dx},0 ${width},${height / 2} ${width - dx},${height} ${dx},${height} 0,${height / 2}`;
    }
    default:
      return '';
  }
}

const Polygon = memo(
  ({ layer, onPointerDown, selectionColor }: PolygonProps) => {
    const { x, y, width, height, fill } = layer;
    const points = getPolygonPoints(layer.type, width, height);

    return (
      <polygon
        onPointerDown={onPointerDown}
        points={points}
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

export { Polygon };
