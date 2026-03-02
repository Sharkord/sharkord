import { CanvasMode } from '@sharkord/shared';
import getStroke from 'perfect-freehand';
import { memo, useCallback, useRef } from 'react';
import { Cursors } from './Cursors';
import { SelectionBox } from './SelectionBox';
import { Toolbar } from './Toolbar';
import { LayerPreview } from './objects/LayerPreview';
import { useWhiteboard } from './use-whiteboard';
import { colorToCss, getSvgPathFromStroke, pointerEventToCanvasPoint } from './utils';

type WhiteboardPanelProps = {
  channelId: number;
};

const WhiteboardPanel = memo(({ channelId }: WhiteboardPanelProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const wb = useWhiteboard(channelId, svgRef);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const point = pointerEventToCanvasPoint(e, wb.camera, svgRef.current);
      wb.onPointerDown(e, point);
    },
    [wb]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const point = pointerEventToCanvasPoint(e, wb.camera, svgRef.current);
      wb.onPointerMove(e, point);
    },
    [wb]
  );

  const handlePointerUp = useCallback(() => {
    wb.onPointerUp();
  }, [wb]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      wb.setCamera((prev) => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    },
    [wb]
  );

  const getCursorStyle = () => {
    switch (wb.canvasMode) {
      case CanvasMode.Pencil:
        return 'crosshair';
      case CanvasMode.Inserting:
        return 'crosshair';
      default:
        return 'default';
    }
  };

  return (
    <div className="relative flex-1 bg-muted/30 overflow-hidden">
      <Toolbar
        canvasMode={wb.canvasMode}
        insertingLayerType={wb.insertingLayerType}
        selectedColor={wb.selectedColor}
        strokeSize={wb.strokeSize}
        onModeChange={wb.onModeChange}
        onColorChange={wb.setSelectedColor}
        onStrokeSizeChange={wb.setStrokeSize}
        onUndo={wb.undo}
        onRedo={wb.redo}
        onClear={wb.clearAll}
        canUndo={wb.canUndo}
        canRedo={wb.canRedo}
      />

      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ cursor: getCursorStyle() }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
      >
        <g
          style={{
            transform: `translate(${wb.camera.x}px, ${wb.camera.y}px)`
          }}
        >
          {/* Grid pattern */}
          <defs>
            <pattern
              id="grid"
              width="40"
              height="40"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r="1" fill="currentColor" opacity="0.15" />
            </pattern>
          </defs>
          <rect
            x={-5000}
            y={-5000}
            width={10000}
            height={10000}
            fill="url(#grid)"
          />

          {/* Render layers */}
          {wb.layerIds.map((layerId) => {
            const layer = wb.layers[layerId];
            if (!layer) return null;

            const isSelected = wb.selection.includes(layerId);

            return (
              <g
                key={layerId}
                onDoubleClick={() => wb.onLayerDoubleClick(layerId)}
              >
                <LayerPreview
                  layer={layer}
                  onPointerDown={(e) => wb.onLayerPointerDown(e, layerId)}
                  selectionColor={isSelected ? '#3b82f6' : undefined}
                  onValueChange={(value) => wb.updateLayerValue(layerId, value)}
                  isEditing={wb.editingLayerId === layerId}
                />
              </g>
            );
          })}

          {/* Selection box */}
          <SelectionBox
            layers={wb.layers}
            selection={wb.selection}
            onResizeHandlePointerDown={wb.onResizeHandlePointerDown}
          />

          {/* Selection net */}
          {wb.selectionNetOrigin && wb.selectionNetCurrent && (
            <rect
              x={Math.min(wb.selectionNetOrigin.x, wb.selectionNetCurrent.x)}
              y={Math.min(wb.selectionNetOrigin.y, wb.selectionNetCurrent.y)}
              width={Math.abs(
                wb.selectionNetCurrent.x - wb.selectionNetOrigin.x
              )}
              height={Math.abs(
                wb.selectionNetCurrent.y - wb.selectionNetOrigin.y
              )}
              fill="rgba(59, 130, 246, 0.1)"
              stroke="#3b82f6"
              strokeWidth={1}
            />
          )}

          {/* Pencil draft */}
          {wb.pencilDraft && wb.pencilDraft.length > 0 && (
            <path
              d={getSvgPathFromStroke(
                getStroke(wb.pencilDraft, {
                  size: wb.strokeSize,
                  thinning: 0.5,
                  smoothing: 0.5,
                  streamline: 0.5
                })
              )}
              fill={colorToCss(wb.selectedColor)}
            />
          )}

          {/* Cursors */}
          <Cursors cursors={wb.cursors} currentUserId={wb.ownUserId} />
        </g>
      </svg>
    </div>
  );
});

export { WhiteboardPanel };
