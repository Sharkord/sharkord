import { useOwnUser } from '@/features/server/users/hooks';
import { getTRPCClient } from '@/lib/trpc';
import {
  CanvasMode,
  type Color,
  type Layer,
  LayerType,
  type LineLayer,
  type Point,
  Side,
  type WhiteboardCursor,
  type XYWH
} from '@sharkord/shared';
import { throttle } from 'lodash-es';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  findIntersectingLayersWithRectangle,
  penPointsToPathLayer,
  pointerEventToCanvasPoint,
  resizeBounds
} from './utils';

type HistoryEntry = {
  layers: Record<string, Layer>;
  layerIds: string[];
};

export function useWhiteboard(channelId: number, svgRef: React.RefObject<SVGSVGElement | null>) {
  const ownUser = useOwnUser();
  const [layers, setLayers] = useState<Record<string, Layer>>({});
  const layersRef = useRef<Record<string, Layer>>({});
  layersRef.current = layers;
  const [layerIds, setLayerIds] = useState<string[]>([]);
  const layerIdsRef = useRef<string[]>([]);
  layerIdsRef.current = layerIds;
  const [selection, setSelection] = useState<string[]>([]);
  const [canvasMode, setCanvasMode] = useState<CanvasMode>(CanvasMode.None);
  const [insertingLayerType, setInsertingLayerType] = useState<LayerType | null>(null);
  const [camera, setCamera] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [selectedColor, setSelectedColor] = useState<Color>({ r: 39, g: 142, b: 237 });
  const [pencilDraft, setPencilDraft] = useState<number[][] | null>(null);
  const [strokeSize, setStrokeSize] = useState(16);
  const [cursors, setCursors] = useState<Map<number, WhiteboardCursor>>(new Map());

  // Selection net
  const [selectionNetOrigin, setSelectionNetOrigin] = useState<Point | null>(null);
  const [selectionNetCurrent, setSelectionNetCurrent] = useState<Point | null>(null);

  // Resize
  const [resizeCorner, setResizeCorner] = useState<Side | null>(null);
  const [resizeInitialBounds, setResizeInitialBounds] = useState<XYWH | null>(null);

  // Translate
  const [translateOrigin, setTranslateOrigin] = useState<Point | null>(null);

  // Panning (middle-click or hand tool)
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const panCameraStartRef = useRef<Point>({ x: 0, y: 0 });
  const prevModeRef = useRef<CanvasMode>(CanvasMode.None);

  // Insert drag
  const insertDragRef = useRef<{ layerId: string; origin: Point } | null>(null);

  // Line click-click: tracks a line waiting for the second click
  const linePendingRef = useRef<{ layerId: string; origin: Point } | null>(null);

  // Auto-focus text layer after creation
  const [editingLayerId, setEditingLayerId] = useState<string | null>(null);

  // Clipboard (local, for copy/paste)
  const clipboardRef = useRef<{ layers: Record<string, Layer>; layerIds: string[] } | null>(null);

  // Undo/redo
  const history = useRef<HistoryEntry[]>([]);
  const historyIndex = useRef(-1);

  const trpc = useMemo(() => getTRPCClient(), []);

  // --- Fetch initial state ---
  useEffect(() => {
    trpc.whiteboard.getState.query({ channelId }).then((state) => {
      setLayers(state.layers);
      setLayerIds(state.layerIds);
      pushToHistory(state.layers, state.layerIds);
    });
  }, [channelId, trpc]);

  // --- Subscribe to remote events ---
  useEffect(() => {
    const subs = [
      trpc.whiteboard.onLayerAdd.subscribe(
        { channelId },
        {
          onData: (data) => {
            setLayers((prev) => ({ ...prev, [data.layerId]: data.layer as Layer }));
            setLayerIds((prev) =>
              prev.includes(data.layerId) ? prev : [...prev, data.layerId]
            );
          }
        }
      ),
      trpc.whiteboard.onLayerUpdate.subscribe(
        { channelId },
        {
          onData: (data) => {
            setLayers((prev) => {
              const existing = prev[data.layerId];
              if (!existing) return prev;
              return {
                ...prev,
                [data.layerId]: { ...existing, ...data.layer } as Layer
              };
            });
          }
        }
      ),
      trpc.whiteboard.onLayerDelete.subscribe(
        { channelId },
        {
          onData: (data) => {
            const deletedSet = new Set(data.layerIds);
            setLayers((prev) => {
              const next = { ...prev };
              for (const id of data.layerIds) delete next[id];
              return next;
            });
            setLayerIds((prev) => prev.filter((id) => !deletedSet.has(id)));
            setSelection((prev) => prev.filter((id) => !deletedSet.has(id)));
          }
        }
      ),
      trpc.whiteboard.onCursorUpdate.subscribe(
        { channelId },
        {
          onData: (data) => {
            setCursors((prev) => {
              const next = new Map(prev);
              next.set(data.cursor.userId, data.cursor);
              return next;
            });
          }
        }
      ),
      trpc.whiteboard.onClear.subscribe(
        { channelId },
        {
          onData: () => {
            setLayers({});
            setLayerIds([]);
            setSelection([]);
          }
        }
      )
    ];

    return () => subs.forEach((s) => s.unsubscribe());
  }, [channelId, trpc]);

  // --- History ---
  const pushToHistory = useCallback(
    (l: Record<string, Layer>, ids: string[]) => {
      const entry: HistoryEntry = {
        layers: { ...l },
        layerIds: [...ids]
      };
      history.current = history.current.slice(0, historyIndex.current + 1);
      history.current.push(entry);
      historyIndex.current = history.current.length - 1;
    },
    []
  );

  const canUndo = historyIndex.current > 0;
  const canRedo = historyIndex.current < history.current.length - 1;

  const undo = useCallback(() => {
    if (historyIndex.current <= 0) return;
    historyIndex.current--;
    const entry = history.current[historyIndex.current];
    setLayers(entry.layers);
    setLayerIds(entry.layerIds);
    setSelection([]);
  }, []);

  const redo = useCallback(() => {
    if (historyIndex.current >= history.current.length - 1) return;
    historyIndex.current++;
    const entry = history.current[historyIndex.current];
    setLayers(entry.layers);
    setLayerIds(entry.layerIds);
    setSelection([]);
  }, []);

  // --- Cursor broadcasting ---
  const broadcastCursor = useMemo(
    () =>
      throttle((x: number, y: number) => {
        trpc.whiteboard.cursorUpdate.mutate({ channelId, x, y });
      }, 50),
    [channelId, trpc]
  );

  // --- Layer ID generation ---
  const generateLayerId = useCallback(() => {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }, []);

  // --- Mode changes ---
  const onModeChange = useCallback(
    (mode: CanvasMode, layerType?: LayerType) => {
      // Cancel pending line if switching away
      if (linePendingRef.current) {
        const pendingId = linePendingRef.current.layerId;
        linePendingRef.current = null;
        setLayers((prev) => {
          const next = { ...prev };
          delete next[pendingId];
          return next;
        });
        setLayerIds((prev) => prev.filter((id) => id !== pendingId));
      }

      setCanvasMode(mode);
      setInsertingLayerType(layerType ?? null);
      if (mode !== CanvasMode.None) {
        setSelection([]);
      }
    },
    []
  );

  // --- Start inserting a layer (pointerDown) ---
  const startInsertLayer = useCallback(
    (type: LayerType, position: Point) => {
      const layerId = generateLayerId();
      const baseLayer = {
        x: position.x,
        y: position.y,
        width: 1,
        height: 1,
        fill: selectedColor
      };

      let layer: Layer;
      switch (type) {
        case LayerType.Rectangle:
          layer = { ...baseLayer, type: LayerType.Rectangle };
          break;
        case LayerType.Ellipse:
          layer = { ...baseLayer, type: LayerType.Ellipse };
          break;
        case LayerType.Triangle:
          layer = { ...baseLayer, type: LayerType.Triangle };
          break;
        case LayerType.Hexagon:
          layer = { ...baseLayer, type: LayerType.Hexagon };
          break;
        case LayerType.Line:
          layer = { type: LayerType.Line, x: position.x, y: position.y, width: 0, height: 0, fill: selectedColor, x2: position.x, y2: position.y };
          break;
        case LayerType.Text:
          layer = { ...baseLayer, type: LayerType.Text, value: '' };
          break;
        default:
          return;
      }

      setLayers((prev) => ({ ...prev, [layerId]: layer }));
      setLayerIds((prev) => [...prev, layerId]);
      setSelection([layerId]);

      if (type === LayerType.Line) {
        // Line uses click-click: first click sets origin, move previews, second click finalizes
        linePendingRef.current = { layerId, origin: position };
      } else {
        insertDragRef.current = { layerId, origin: position };
      }
    },
    [generateLayerId, selectedColor]
  );

  // --- Finalize inserted layer (pointerUp or second click for lines) ---
  const finalizeInsertLayer = useCallback(() => {
    // Check linePendingRef first (click-click lines), then insertDragRef (drag shapes)
    const drag = linePendingRef.current ?? insertDragRef.current;
    if (!drag) return;

    linePendingRef.current = null;
    insertDragRef.current = null;

    // Use refs to get latest state (avoids stale closures)
    const currentLayers = layersRef.current;
    const currentLayerIds = layerIdsRef.current;

    const layer = currentLayers[drag.layerId];
    if (!layer) return;

    // Enforce minimum size (skip for lines — they use x2/y2 directly)
    const finalLayer = layer.type === LayerType.Line
      ? layer
      : { ...layer, width: Math.max(layer.width, 20), height: Math.max(layer.height, 20) } as Layer;

    const newLayers = { ...currentLayers, [drag.layerId]: finalLayer };
    const newLayerIds = [...currentLayerIds];

    setLayers(newLayers);

    // Commit to server + history
    trpc.whiteboard.addLayer.mutate({
      channelId,
      layerId: drag.layerId,
      layer: finalLayer
    });
    pushToHistory(newLayers, newLayerIds);

    // Auto-focus text layers
    if (layer.type === LayerType.Text) {
      setEditingLayerId(drag.layerId);
    }
  }, [channelId, trpc, pushToHistory]);

  // --- Delete selection ---
  const deleteSelection = useCallback(() => {
    if (selection.length === 0) return;

    const deletedSet = new Set(selection);
    const newLayers = { ...layers };
    for (const id of selection) delete newLayers[id];
    const newLayerIds = layerIds.filter((id) => !deletedSet.has(id));

    setLayers(newLayers);
    setLayerIds(newLayerIds);
    setSelection([]);

    trpc.whiteboard.deleteLayer.mutate({ channelId, layerIds: selection });
    pushToHistory(newLayers, newLayerIds);
  }, [channelId, layers, layerIds, selection, trpc, pushToHistory]);

  // --- Clear all ---
  const clearAll = useCallback(() => {
    setLayers({});
    setLayerIds([]);
    setSelection([]);
    trpc.whiteboard.clear.mutate({ channelId });
    pushToHistory({}, []);
  }, [channelId, trpc, pushToHistory]);

  // --- Update color (sets default + applies to selection) ---
  const updateColor = useCallback(
    (color: Color) => {
      setSelectedColor(color);
      if (selection.length === 0) return;

      setLayers((prev) => {
        const next = { ...prev };
        for (const id of selection) {
          const layer = prev[id];
          if (!layer) continue;
          next[id] = { ...layer, fill: color } as Layer;
          trpc.whiteboard.updateLayer.mutate({
            channelId,
            layerId: id,
            layer: { fill: color }
          });
        }
        return next;
      });
    },
    [channelId, selection, trpc]
  );

  // --- Update layer value (for text/note) ---
  const updateLayerValue = useCallback(
    (layerId: string, value: string) => {
      setLayers((prev) => {
        const layer = prev[layerId];
        if (!layer) return prev;
        return { ...prev, [layerId]: { ...layer, value } as Layer };
      });
      trpc.whiteboard.updateLayer.mutate({
        channelId,
        layerId,
        layer: { value } as Partial<Layer>
      });
    },
    [channelId, trpc]
  );

  // --- Pointer handlers ---
  const onPointerDown = useCallback(
    (e: React.PointerEvent, point: Point) => {
      setEditingLayerId(null);

      // Middle-click pan from any mode
      if (e.button === 1) {
        e.preventDefault();
        prevModeRef.current = canvasMode;
        panStartRef.current = { x: e.clientX, y: e.clientY };
        panCameraStartRef.current = { ...camera };
        setCanvasMode(CanvasMode.Panning);
        return;
      }

      // Hand tool pan
      if (canvasMode === CanvasMode.Panning) {
        panStartRef.current = { x: e.clientX, y: e.clientY };
        panCameraStartRef.current = { ...camera };
        return;
      }

      if (canvasMode === CanvasMode.Pencil) {
        setPencilDraft([[point.x, point.y, e.pressure]]);
        return;
      }

      if (canvasMode === CanvasMode.Inserting && insertingLayerType) {
        // Line tool: second click finalizes the line
        if (linePendingRef.current) {
          finalizeInsertLayer();
          return;
        }

        startInsertLayer(insertingLayerType, point);
        return;
      }

      // Selection mode - clear selection and start selection net
      if (canvasMode === CanvasMode.None) {
        setSelection([]);
        setSelectionNetOrigin(point);
        setSelectionNetCurrent(point);
        setCanvasMode(CanvasMode.SelectionNet);
      }
    },
    [camera, canvasMode, finalizeInsertLayer, insertingLayerType, startInsertLayer]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent, point: Point) => {
      broadcastCursor(point.x, point.y);

      // Panning (hand tool or middle-click)
      if (canvasMode === CanvasMode.Panning && panStartRef.current) {
        const dx = (e.clientX - panStartRef.current.x) / zoom;
        const dy = (e.clientY - panStartRef.current.y) / zoom;
        setCamera({
          x: panCameraStartRef.current.x + dx,
          y: panCameraStartRef.current.y + dy
        });
        return;
      }

      if (canvasMode === CanvasMode.Pencil && pencilDraft) {
        setPencilDraft((prev) =>
          prev ? [...prev, [point.x, point.y, e.pressure]] : null
        );
        return;
      }

      // Line click-click preview: just update the endpoint
      if (canvasMode === CanvasMode.Inserting && linePendingRef.current) {
        const { layerId } = linePendingRef.current;

        setLayers((prev) => {
          const layer = prev[layerId];
          if (!layer || layer.type !== LayerType.Line) return prev;

          return {
            ...prev,
            [layerId]: { ...layer, x2: point.x, y2: point.y } as Layer
          };
        });
        return;
      }

      // Drag-to-size while inserting (non-line shapes)
      if (canvasMode === CanvasMode.Inserting && insertDragRef.current) {
        const { layerId, origin } = insertDragRef.current;

        setLayers((prev) => {
          const layer = prev[layerId];
          if (!layer) return prev;

          // Other shapes: bounding box resize
          let width = Math.abs(point.x - origin.x);
          let height = Math.abs(point.y - origin.y);
          if (e.shiftKey) {
            const size = Math.max(width, height);
            width = size;
            height = size;
          }
          const x = point.x >= origin.x ? origin.x : origin.x - width;
          const y = point.y >= origin.y ? origin.y : origin.y - height;
          return { ...prev, [layerId]: { ...layer, x, y, width, height } as Layer };
        });
        return;
      }

      if (canvasMode === CanvasMode.SelectionNet && selectionNetOrigin) {
        setSelectionNetCurrent(point);
        const selected = findIntersectingLayersWithRectangle(
          layerIds,
          layers,
          selectionNetOrigin,
          point
        );
        setSelection(selected);
        return;
      }

      if (canvasMode === CanvasMode.Translating && translateOrigin) {
        const dx = point.x - translateOrigin.x;
        const dy = point.y - translateOrigin.y;

        setLayers((prev) => {
          const next = { ...prev };
          for (const id of selection) {
            const layer = prev[id];
            if (!layer) continue;
            let newX = layer.x + dx;
            let newY = layer.y + dy;

            // Snap text layers to nearby shape centers
            if (layer.type === LayerType.Text) {
              const SNAP_THRESHOLD = 15;
              const textCx = newX + layer.width / 2;
              const textCy = newY + layer.height / 2;

              for (const [otherId, other] of Object.entries(prev)) {
                if (otherId === id || other.type === LayerType.Text || other.type === LayerType.Path) continue;
                const shapeCx = other.x + other.width / 2;
                const shapeCy = other.y + other.height / 2;
                if (
                  Math.abs(textCx - shapeCx) < SNAP_THRESHOLD &&
                  Math.abs(textCy - shapeCy) < SNAP_THRESHOLD
                ) {
                  newX = shapeCx - layer.width / 2;
                  newY = shapeCy - layer.height / 2;
                  break;
                }
              }
            }

            if (layer.type === LayerType.Line) {
              const line = layer as LineLayer;
              next[id] = { ...line, x: newX, y: newY, x2: line.x2 + (newX - line.x), y2: line.y2 + (newY - line.y) };
            } else {
              next[id] = { ...layer, x: newX, y: newY } as Layer;
            }
          }
          return next;
        });
        setTranslateOrigin(point);
        return;
      }

      if (
        canvasMode === CanvasMode.Resizing &&
        resizeCorner !== null &&
        resizeInitialBounds &&
        selection.length === 1
      ) {
        const newBounds = resizeBounds(resizeInitialBounds, resizeCorner, point, e.shiftKey);
        const layerId = selection[0];
        setLayers((prev) => {
          const layer = prev[layerId];
          if (!layer) return prev;
          return {
            ...prev,
            [layerId]: {
              ...layer,
              x: newBounds.x,
              y: newBounds.y,
              width: newBounds.width,
              height: newBounds.height
            } as Layer
          };
        });
        return;
      }
    },
    [
      broadcastCursor,
      canvasMode,
      layers,
      layerIds,
      pencilDraft,
      resizeCorner,
      resizeInitialBounds,
      selection,
      selectionNetOrigin,
      translateOrigin,
      zoom
    ]
  );

  const onPointerUp = useCallback((e?: React.PointerEvent) => {
    // End panning
    if (canvasMode === CanvasMode.Panning) {
      panStartRef.current = null;
      // If middle-click triggered panning, restore previous mode
      if (e?.button === 1) {
        setCanvasMode(prevModeRef.current);
      }
      return;
    }

    // Finalize drag-to-create (non-line shapes only; lines use click-click)
    if (canvasMode === CanvasMode.Inserting && insertDragRef.current) {
      finalizeInsertLayer();
      return;
    }

    // Line pending: don't finalize on pointer up — wait for second click
    if (canvasMode === CanvasMode.Inserting && linePendingRef.current) {
      return;
    }

    if (canvasMode === CanvasMode.Pencil && pencilDraft && pencilDraft.length > 1) {
      const pathLayer = penPointsToPathLayer(pencilDraft, selectedColor, strokeSize);
      const layerId = generateLayerId();

      setLayers((prev) => ({ ...prev, [layerId]: pathLayer }));
      setLayerIds((prev) => [...prev, layerId]);
      setPencilDraft(null);

      trpc.whiteboard.addLayer.mutate({ channelId, layerId, layer: pathLayer });
      pushToHistory(
        { ...layers, [layerId]: pathLayer },
        [...layerIds, layerId]
      );
      return;
    }

    if (canvasMode === CanvasMode.SelectionNet) {
      setSelectionNetOrigin(null);
      setSelectionNetCurrent(null);
      setCanvasMode(CanvasMode.None);
      return;
    }

    if (canvasMode === CanvasMode.Translating) {
      // Commit translated positions
      for (const id of selection) {
        const layer = layers[id];
        if (layer) {
          const update: Record<string, unknown> = { x: layer.x, y: layer.y };
          if (layer.type === LayerType.Line) {
            const line = layer as LineLayer;
            update.x2 = line.x2;
            update.y2 = line.y2;
          }
          trpc.whiteboard.updateLayer.mutate({
            channelId,
            layerId: id,
            layer: update
          });
        }
      }
      setCanvasMode(CanvasMode.None);
      setTranslateOrigin(null);
      pushToHistory(layers, layerIds);
      return;
    }

    if (canvasMode === CanvasMode.Resizing && selection.length === 1) {
      const layer = layers[selection[0]];
      if (layer) {
        trpc.whiteboard.updateLayer.mutate({
          channelId,
          layerId: selection[0],
          layer: {
            x: layer.x,
            y: layer.y,
            width: layer.width,
            height: layer.height
          }
        });
      }
      setCanvasMode(CanvasMode.None);
      setResizeCorner(null);
      setResizeInitialBounds(null);
      pushToHistory(layers, layerIds);
      return;
    }

    setPencilDraft(null);
  }, [
    canvasMode,
    channelId,
    finalizeInsertLayer,
    generateLayerId,
    layers,
    layerIds,
    pencilDraft,
    pushToHistory,
    selectedColor,
    selection,
    strokeSize,
    trpc
  ]);

  // --- Layer pointer down (for selecting/translating) ---
  const onLayerPointerDown = useCallback(
    (e: React.PointerEvent, layerId: string) => {
      if (
        canvasMode === CanvasMode.Pencil ||
        canvasMode === CanvasMode.Inserting ||
        canvasMode === CanvasMode.Panning
      ) {
        return;
      }

      e.stopPropagation();

      const point = pointerEventToCanvasPoint(e, camera, svgRef.current, zoom);

      if (!selection.includes(layerId)) {
        setSelection([layerId]);
      }

      setCanvasMode(CanvasMode.Translating);
      setTranslateOrigin(point);
    },
    [camera, canvasMode, selection, svgRef, zoom]
  );

  // --- Resize handle ---
  const onResizeHandlePointerDown = useCallback(
    (corner: Side, initialBounds: XYWH) => {
      setCanvasMode(CanvasMode.Resizing);
      setResizeCorner(corner);
      setResizeInitialBounds(initialBounds);
    },
    []
  );

  // --- Layer ordering ---
  const bringForward = useCallback(() => {
    if (selection.length !== 1) return;
    const id = selection[0];
    setLayerIds((prev) => {
      const idx = prev.indexOf(id);
      if (idx === -1 || idx === prev.length - 1) return prev;
      const next = [...prev];
      [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
      return next;
    });
  }, [selection]);

  const sendBackward = useCallback(() => {
    if (selection.length !== 1) return;
    const id = selection[0];
    setLayerIds((prev) => {
      const idx = prev.indexOf(id);
      if (idx <= 0) return prev;
      const next = [...prev];
      [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
      return next;
    });
  }, [selection]);

  const bringToFront = useCallback(() => {
    if (selection.length !== 1) return;
    const id = selection[0];
    setLayerIds((prev) => {
      const idx = prev.indexOf(id);
      if (idx === -1 || idx === prev.length - 1) return prev;
      return [...prev.filter((i) => i !== id), id];
    });
  }, [selection]);

  const sendToBack = useCallback(() => {
    if (selection.length !== 1) return;
    const id = selection[0];
    setLayerIds((prev) => {
      const idx = prev.indexOf(id);
      if (idx <= 0) return prev;
      return [id, ...prev.filter((i) => i !== id)];
    });
  }, [selection]);

  // --- Double-click to edit text layer ---
  const onLayerDoubleClick = useCallback(
    (layerId: string) => {
      const layer = layers[layerId];
      if (layer?.type === LayerType.Text) {
        setEditingLayerId(layerId);
      }
    },
    [layers]
  );

  // --- Copy/Paste ---
  const copySelection = useCallback(() => {
    if (selection.length === 0) return;
    const copiedLayers: Record<string, Layer> = {};
    const copiedIds: string[] = [];
    for (const id of selection) {
      const layer = layers[id];
      if (layer) {
        copiedLayers[id] = { ...layer };
        copiedIds.push(id);
      }
    }
    clipboardRef.current = { layers: copiedLayers, layerIds: copiedIds };
  }, [selection, layers]);

  const pasteClipboard = useCallback(() => {
    const clip = clipboardRef.current;
    if (!clip || clip.layerIds.length === 0) return;

    const PASTE_OFFSET = 20;
    const newSelection: string[] = [];
    const addedLayers: Record<string, Layer> = {};
    const addedIds: string[] = [];

    for (const oldId of clip.layerIds) {
      const original = clip.layers[oldId];
      if (!original) continue;

      const newId = generateLayerId();
      const cloned = {
        ...original,
        x: original.x + PASTE_OFFSET,
        y: original.y + PASTE_OFFSET
      } as Layer;

      // Offset line endpoints too
      if (cloned.type === LayerType.Line) {
        (cloned as LineLayer).x2 += PASTE_OFFSET;
        (cloned as LineLayer).y2 += PASTE_OFFSET;
      }

      addedLayers[newId] = cloned;
      addedIds.push(newId);
      newSelection.push(newId);
    }

    setLayers((prev) => ({ ...prev, ...addedLayers }));
    setLayerIds((prev) => [...prev, ...addedIds]);
    setSelection(newSelection);

    // Commit to server
    for (const id of addedIds) {
      trpc.whiteboard.addLayer.mutate({
        channelId,
        layerId: id,
        layer: addedLayers[id]
      });
    }

    const allLayers = { ...layersRef.current, ...addedLayers };
    const allIds = [...layerIdsRef.current, ...addedIds];
    pushToHistory(allLayers, allIds);

    // Update clipboard offset so repeated pastes cascade
    clipboardRef.current = { layers: addedLayers, layerIds: addedIds };
  }, [channelId, generateLayerId, trpc, pushToHistory]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        const tag = document.activeElement?.tagName;
        if (
          tag !== 'INPUT' &&
          tag !== 'TEXTAREA' &&
          !(document.activeElement as HTMLElement)?.isContentEditable
        ) {
          deleteSelection();
        }
      }

      // Escape cancels pending line
      if (e.key === 'Escape' && linePendingRef.current) {
        const pendingId = linePendingRef.current.layerId;
        linePendingRef.current = null;
        setLayers((prev) => {
          const next = { ...prev };
          delete next[pendingId];
          return next;
        });
        setLayerIds((prev) => prev.filter((id) => id !== pendingId));
        setSelection([]);
        return;
      }

      // Escape exits text editing
      if (e.key === 'Escape' && editingLayerId) {
        setEditingLayerId(null);
        (document.activeElement as HTMLElement)?.blur();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }

      // Copy
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !editingLayerId) {
        const tag = document.activeElement?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !(document.activeElement as HTMLElement)?.isContentEditable) {
          copySelection();
        }
      }

      // Paste
      if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !editingLayerId) {
        const tag = document.activeElement?.tagName;
        if (tag !== 'INPUT' && tag !== 'TEXTAREA' && !(document.activeElement as HTMLElement)?.isContentEditable) {
          pasteClipboard();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelection, editingLayerId, undo, redo, copySelection, pasteClipboard]);

  return {
    layers,
    layerIds,
    selection,
    canvasMode,
    insertingLayerType,
    camera,
    setCamera,
    zoom,
    setZoom,
    selectedColor,
    updateColor,
    pencilDraft,
    strokeSize,
    setStrokeSize,
    cursors,
    selectionNetOrigin,
    selectionNetCurrent,
    canUndo,
    canRedo,
    editingLayerId,
    setEditingLayerId,
    onModeChange,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onLayerPointerDown,
    onLayerDoubleClick,
    onResizeHandlePointerDown,
    updateLayerValue,
    deleteSelection,
    clearAll,
    undo,
    redo,
    bringForward,
    sendBackward,
    bringToFront,
    sendToBack,
    ownUserId: ownUser?.id ?? 0
  };
}
