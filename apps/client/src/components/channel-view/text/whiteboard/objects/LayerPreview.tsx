import { type Layer, LayerType } from '@sharkord/shared';
import { memo } from 'react';
import { Arrow } from './Arrow';
import { Ellipse } from './Ellipse';
import { Line } from './Line';
import { Note } from './Note';
import { Path } from './Path';
import { Polygon } from './Polygon';
import { Rectangle } from './Rectangle';
import { Text } from './Text';

type LayerPreviewProps = {
  layer: Layer;
  onPointerDown?: (e: React.PointerEvent) => void;
  selectionColor?: string;
  onValueChange?: (value: string) => void;
  isEditing?: boolean;
};

const LayerPreview = memo(
  ({ layer, onPointerDown, selectionColor, onValueChange, isEditing }: LayerPreviewProps) => {
    switch (layer.type) {
      case LayerType.Rectangle:
        return (
          <Rectangle
            layer={layer}
            onPointerDown={onPointerDown}
            selectionColor={selectionColor}
          />
        );
      case LayerType.Ellipse:
        return (
          <Ellipse
            layer={layer}
            onPointerDown={onPointerDown}
            selectionColor={selectionColor}
          />
        );
      case LayerType.Triangle:
      case LayerType.Hexagon:
        return (
          <Polygon
            layer={layer}
            onPointerDown={onPointerDown}
            selectionColor={selectionColor}
          />
        );
      case LayerType.Line:
        return (
          <Line
            layer={layer}
            onPointerDown={onPointerDown}
            selectionColor={selectionColor}
          />
        );
      case LayerType.Arrow:
        return (
          <Arrow
            layer={layer}
            onPointerDown={onPointerDown}
            selectionColor={selectionColor}
          />
        );
      case LayerType.Path:
        return (
          <Path
            layer={layer}
            onPointerDown={onPointerDown}
            selectionColor={selectionColor}
          />
        );
      case LayerType.Text:
        return (
          <Text
            layer={layer}
            onPointerDown={onPointerDown}
            selectionColor={selectionColor}
            onValueChange={onValueChange}
            isEditing={isEditing}
          />
        );
      case LayerType.Note:
        return (
          <Note
            layer={layer}
            onPointerDown={onPointerDown}
            selectionColor={selectionColor}
            onValueChange={onValueChange}
          />
        );
      default:
        return null;
    }
  }
);

export { LayerPreview };
