import { CanvasMode } from '@sharkord/shared';
import getStroke from 'perfect-freehand';
import {
  ArrowDown,
  ArrowDownToLine,
  ArrowUp,
  ArrowUpToLine,
  Maximize,
  Minimize,
  Minus,
  Plus,
  X
} from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Cursors } from './Cursors';
import { SelectionBox } from './SelectionBox';
import { Toolbar } from './Toolbar';
import { LayerPreview } from './objects/LayerPreview';
import { useWhiteboard } from './use-whiteboard';
import { colorToCss, getSvgPathFromStroke, pointerEventToCanvasPoint } from './utils';

type WhiteboardPanelProps = {
  channelId: number;
  onClose?: () => void;
};

const WhiteboardPanel = memo(({ channelId, onClose }: WhiteboardPanelProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const wb = useWhiteboard(channelId, svgRef);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fullscreen tracking
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (document.fullscreenElement === containerRef.current) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const point = pointerEventToCanvasPoint(e, wb.camera, svgRef.current, wb.zoom);
      wb.onPointerDown(e, point);
    },
    [wb]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const point = pointerEventToCanvasPoint(e, wb.camera, svgRef.current, wb.zoom);
      wb.onPointerMove(e, point);
    },
    [wb]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    wb.onPointerUp(e);
  }, [wb]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      wb.setCamera((prev) => ({
        x: prev.x - e.deltaX / wb.zoom,
        y: prev.y - e.deltaY / wb.zoom
      }));
    },
    [wb]
  );

  const resetView = useCallback(() => {
    wb.setCamera({ x: 0, y: 0 });
    wb.setZoom(1);
  }, [wb]);

  const getCursorStyle = () => {
    switch (wb.canvasMode) {
      case CanvasMode.Pencil:
        return 'crosshair';
      case CanvasMode.Inserting:
        return 'crosshair';
      case CanvasMode.Panning:
        return 'grab';
      default:
        return 'default';
    }
  };

  const isPenMode = wb.canvasMode === CanvasMode.Pencil;
  const hasSelection = wb.selection.length === 1;
  const zoomPercent = Math.round(wb.zoom * 100);

  return (
    <div ref={containerRef} className="relative flex-1 flex flex-col bg-muted/30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-card/50 shrink-0">
        <span className="text-sm font-medium text-muted-foreground">Whiteboard</span>
        <div className="flex items-center gap-1">
          {/* Zoom controls */}
          <button
            className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
            onClick={() => wb.setZoom((z) => Math.max(0.2, Math.round((z - 0.1) * 100) / 100))}
            title="Zoom out"
          >
            <Minus size={14} />
          </button>
          <span
            className="text-xs text-muted-foreground w-10 text-center cursor-pointer select-none"
            onClick={resetView}
            title="Reset view"
          >
            {zoomPercent}%
          </span>
          <button
            className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
            onClick={() => wb.setZoom((z) => Math.min(5, Math.round((z + 0.1) * 100) / 100))}
            title="Zoom in"
          >
            <Plus size={14} />
          </button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <button
            className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
          </button>
          {onClose && (
            <button
              className="p-1 rounded hover:bg-muted text-muted-foreground transition-colors"
              onClick={onClose}
              title="Close whiteboard"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
      <Toolbar
        canvasMode={wb.canvasMode}
        insertingLayerType={wb.insertingLayerType}
        selectedColor={wb.selectedColor}
        onModeChange={wb.onModeChange}
        onColorChange={wb.updateColor}
        onUndo={wb.undo}
        onRedo={wb.redo}
        onClear={wb.clearAll}
        canUndo={wb.canUndo}
        canRedo={wb.canRedo}
      />

      {/* Pen thickness — bottom-right, only in pen mode */}
      {isPenMode && (
        <div className="absolute right-3 bottom-3 flex items-center gap-1.5 bg-card border border-border rounded-xl p-1.5 shadow-lg z-10">
          <button
            className="p-1 rounded hover:bg-muted text-muted-foreground"
            onClick={() => wb.setStrokeSize(Math.max(wb.strokeSize - 4, 4))}
            title="Decrease thickness"
          >
            <Minus size={14} />
          </button>
          <div
            className="rounded-full bg-foreground mx-1"
            style={{
              width: Math.max(4, Math.min(wb.strokeSize, 18)),
              height: Math.max(4, Math.min(wb.strokeSize, 18))
            }}
            title={`Thickness: ${wb.strokeSize}`}
          />
          <button
            className="p-1 rounded hover:bg-muted text-muted-foreground"
            onClick={() => wb.setStrokeSize(Math.min(wb.strokeSize + 4, 48))}
            title="Increase thickness"
          >
            <Plus size={14} />
          </button>
        </div>
      )}

      {/* Layer order — bottom-right, only when a single layer is selected */}
      {hasSelection && !isPenMode && (
        <div className="absolute right-3 bottom-3 flex items-center gap-0.5 bg-card border border-border rounded-xl p-1 shadow-lg z-10">
          <button
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            onClick={wb.sendToBack}
            title="Send to back"
          >
            <ArrowDownToLine size={16} />
          </button>
          <button
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            onClick={wb.sendBackward}
            title="Send backward"
          >
            <ArrowDown size={16} />
          </button>
          <button
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            onClick={wb.bringForward}
            title="Bring forward"
          >
            <ArrowUp size={16} />
          </button>
          <button
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground transition-colors"
            onClick={wb.bringToFront}
            title="Bring to front"
          >
            <ArrowUpToLine size={16} />
          </button>
        </div>
      )}

      <svg
        ref={svgRef}
        className="w-full h-full"
        style={{ cursor: getCursorStyle() }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={(e) => handlePointerUp(e)}
        onWheel={handleWheel}
      >
        <g
          style={{
            transform: `scale(${wb.zoom}) translate(${wb.camera.x}px, ${wb.camera.y}px)`,
            transformOrigin: '0 0'
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
    </div>
  );
});

export { WhiteboardPanel };
