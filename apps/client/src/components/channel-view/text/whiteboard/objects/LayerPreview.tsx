import { type Layer, LayerType } from '@sharkord/shared';
import { memo } from 'react';
import { Ellipse } from './Ellipse';
import { Note } from './Note';
import { Path } from './Path';
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
