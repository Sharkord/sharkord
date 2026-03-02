import { useOwnUser } from '@/features/server/users/hooks';
import { getTRPCClient } from '@/lib/trpc';
import {
  CanvasMode,
  type Color,
  type Layer,
  LayerType,
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
  resizeBounds
} from './utils';

type HistoryEntry = {
  layers: Record<string, Layer>;
  layerIds: string[];
};

export function useWhiteboard(channelId: number) {
  const ownUser = useOwnUser();
  const [layers, setLayers] = useState<Record<string, Layer>>({});
  const [layerIds, setLayerIds] = useState<string[]>([]);
  const [selection, setSelection] = useState<string[]>([]);
  const [canvasMode, setCanvasMode] = useState<CanvasMode>(CanvasMode.None);
  const [insertingLayerType, setInsertingLayerType] = useState<LayerType | null>(null);
  const [camera, setCamera] = useState<Point>({ x: 0, y: 0 });
  const [selectedColor, setSelectedColor] = useState<Color>({ r: 39, g: 142, b: 237 });
  const [pencilDraft, setPencilDraft] = useState<number[][] | null>(null);
  const [cursors, setCursors] = useState<Map<number, WhiteboardCursor>>(new Map());

  // Selection net
  const [selectionNetOrigin, setSelectionNetOrigin] = useState<Point | null>(null);
  const [selectionNetCurrent, setSelectionNetCurrent] = useState<Point | null>(null);

  // Resize
  const [resizeCorner, setResizeCorner] = useState<Side | null>(null);
  const [resizeInitialBounds, setResizeInitialBounds] = useState<XYWH | null>(null);

  // Translate
  const [translateOrigin, setTranslateOrigin] = useState<Point | null>(null);

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
      setCanvasMode(mode);
      setInsertingLayerType(layerType ?? null);
      if (mode !== CanvasMode.None) {
        setSelection([]);
      }
    },
    []
  );

  // --- Insert layer ---
  const insertLayer = useCallback(
    (type: LayerType, position: Point) => {
      const layerId = generateLayerId();
      const baseLayer = {
        x: position.x,
        y: position.y,
        width: 100,
        height: 100,
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
        case LayerType.Text:
          layer = { ...baseLayer, type: LayerType.Text, value: '' };
          break;
        case LayerType.Note:
          layer = {
            ...baseLayer,
            type: LayerType.Note,
            width: 200,
            height: 200,
            value: ''
          };
          break;
        default:
          return;
      }

      setLayers((prev) => ({ ...prev, [layerId]: layer }));
      setLayerIds((prev) => [...prev, layerId]);
      setSelection([layerId]);
      setCanvasMode(CanvasMode.None);
      setInsertingLayerType(null);

      trpc.whiteboard.addLayer.mutate({ channelId, layerId, layer });
      pushToHistory(
        { ...layers, [layerId]: layer },
        [...layerIds, layerId]
      );
    },
    [channelId, generateLayerId, layers, layerIds, selectedColor, trpc, pushToHistory]
  );

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
      if (canvasMode === CanvasMode.Pencil) {
        setPencilDraft([[point.x, point.y, e.pressure]]);
        return;
      }

      if (canvasMode === CanvasMode.Inserting && insertingLayerType) {
        insertLayer(insertingLayerType, point);
        return;
      }

      // Selection mode - start selection net
      if (canvasMode === CanvasMode.None) {
        setSelectionNetOrigin(point);
        setSelectionNetCurrent(point);
        setCanvasMode(CanvasMode.SelectionNet);
      }
    },
    [canvasMode, insertingLayerType, insertLayer]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent, point: Point) => {
      broadcastCursor(point.x, point.y);

      if (canvasMode === CanvasMode.Pencil && pencilDraft) {
        setPencilDraft((prev) =>
          prev ? [...prev, [point.x, point.y, e.pressure]] : null
        );
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
            next[id] = { ...layer, x: layer.x + dx, y: layer.y + dy } as Layer;
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
        const newBounds = resizeBounds(resizeInitialBounds, resizeCorner, point);
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
      translateOrigin
    ]
  );

  const onPointerUp = useCallback(() => {
    if (canvasMode === CanvasMode.Pencil && pencilDraft && pencilDraft.length > 1) {
      const pathLayer = penPointsToPathLayer(pencilDraft, selectedColor);
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
          trpc.whiteboard.updateLayer.mutate({
            channelId,
            layerId: id,
            layer: { x: layer.x, y: layer.y }
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
    generateLayerId,
    layers,
    layerIds,
    pencilDraft,
    pushToHistory,
    selectedColor,
    selection,
    trpc
  ]);

  // --- Layer pointer down (for selecting/translating) ---
  const onLayerPointerDown = useCallback(
    (e: React.PointerEvent, layerId: string) => {
      if (
        canvasMode === CanvasMode.Pencil ||
        canvasMode === CanvasMode.Inserting
      ) {
        return;
      }

      e.stopPropagation();

      const point = {
        x: Math.round(e.clientX) - camera.x,
        y: Math.round(e.clientY) - camera.y
      };

      if (!selection.includes(layerId)) {
        setSelection([layerId]);
      }

      setCanvasMode(CanvasMode.Translating);
      setTranslateOrigin(point);
    },
    [camera, canvasMode, selection]
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

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (
          document.activeElement?.tagName !== 'INPUT' &&
          !(document.activeElement as HTMLElement)?.isContentEditable
        ) {
          deleteSelection();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelection, undo, redo]);

  return {
    layers,
    layerIds,
    selection,
    canvasMode,
    insertingLayerType,
    camera,
    setCamera,
    selectedColor,
    setSelectedColor,
    pencilDraft,
    cursors,
    selectionNetOrigin,
    selectionNetCurrent,
    canUndo,
    canRedo,
    onModeChange,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onLayerPointerDown,
    onResizeHandlePointerDown,
    updateLayerValue,
    deleteSelection,
    clearAll,
    undo,
    redo,
    ownUserId: ownUser?.id ?? 0
  };
}
