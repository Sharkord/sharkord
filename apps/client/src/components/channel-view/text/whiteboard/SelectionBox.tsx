import { type Layer, LayerType, Side } from '@sharkord/shared';
import { memo } from 'react';

type SelectionBoxProps = {
  layers: Record<string, Layer>;
  selection: string[];
  onResizeHandlePointerDown: (corner: Side, initialBounds: { x: number; y: number; width: number; height: number }) => void;
};

const HANDLE_WIDTH = 8;

const SelectionBox = memo(
  ({ layers, selection, onResizeHandlePointerDown }: SelectionBoxProps) => {
    if (selection.length === 0) return null;

    // Skip selection box for lines/arrows — they highlight themselves
    const selectedType = selection.length === 1 ? layers[selection[0]]?.type : null;
    if (selectedType === LayerType.Line || selectedType === LayerType.Arrow) {
      return null;
    }

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const id of selection) {
      const layer = layers[id];
      if (!layer) continue;
      minX = Math.min(minX, layer.x);
      minY = Math.min(minY, layer.y);
      maxX = Math.max(maxX, layer.x + layer.width);
      maxY = Math.max(maxY, layer.y + layer.height);
    }

    if (!isFinite(minX)) return null;

    const bounds = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    };

    const handlePointerDown = (corner: Side) => (e: React.PointerEvent) => {
      e.stopPropagation();
      onResizeHandlePointerDown(corner, bounds);
    };

    return (
      <>
        <rect
          x={bounds.x}
          y={bounds.y}
          width={bounds.width}
          height={bounds.height}
          fill="transparent"
          stroke="#3b82f6"
          strokeWidth={1}
          pointerEvents="none"
          style={{ strokeDasharray: '5 5' }}
        />
        {/* Corner handles */}
        <rect
          x={bounds.x - HANDLE_WIDTH / 2}
          y={bounds.y - HANDLE_WIDTH / 2}
          width={HANDLE_WIDTH}
          height={HANDLE_WIDTH}
          fill="white"
          stroke="#3b82f6"
          strokeWidth={1}
          style={{ cursor: 'nwse-resize' }}
          onPointerDown={handlePointerDown(Side.Top + Side.Left)}
        />
        <rect
          x={bounds.x + bounds.width - HANDLE_WIDTH / 2}
          y={bounds.y - HANDLE_WIDTH / 2}
          width={HANDLE_WIDTH}
          height={HANDLE_WIDTH}
          fill="white"
          stroke="#3b82f6"
          strokeWidth={1}
          style={{ cursor: 'nesw-resize' }}
          onPointerDown={handlePointerDown(Side.Top + Side.Right)}
        />
        <rect
          x={bounds.x - HANDLE_WIDTH / 2}
          y={bounds.y + bounds.height - HANDLE_WIDTH / 2}
          width={HANDLE_WIDTH}
          height={HANDLE_WIDTH}
          fill="white"
          stroke="#3b82f6"
          strokeWidth={1}
          style={{ cursor: 'nesw-resize' }}
          onPointerDown={handlePointerDown(Side.Bottom + Side.Left)}
        />
        <rect
          x={bounds.x + bounds.width - HANDLE_WIDTH / 2}
          y={bounds.y + bounds.height - HANDLE_WIDTH / 2}
          width={HANDLE_WIDTH}
          height={HANDLE_WIDTH}
          fill="white"
          stroke="#3b82f6"
          strokeWidth={1}
          style={{ cursor: 'nwse-resize' }}
          onPointerDown={handlePointerDown(Side.Bottom + Side.Right)}
        />
      </>
    );
  }
);

export { SelectionBox };
