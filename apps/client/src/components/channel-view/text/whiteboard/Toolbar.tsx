import { CanvasMode, type Color, LayerType } from '@sharkord/shared';
import {
  Circle,
  MousePointer2,
  Pencil,
  Redo2,
  Square,
  StickyNote,
  Trash2,
  Type,
  Undo2
} from 'lucide-react';
import { memo, useState } from 'react';
import { ColorPicker } from './ColorPicker';

type ToolbarProps = {
  canvasMode: CanvasMode;
  insertingLayerType: LayerType | null;
  selectedColor: Color;
  onModeChange: (mode: CanvasMode, layerType?: LayerType) => void;
  onColorChange: (color: Color) => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
};

const Toolbar = memo(
  ({
    canvasMode,
    insertingLayerType,
    selectedColor,
    onModeChange,
    onColorChange,
    onUndo,
    onRedo,
    onClear,
    canUndo,
    canRedo
  }: ToolbarProps) => {
    const [showColorPicker, setShowColorPicker] = useState(false);

    const isActive = (mode: CanvasMode, layerType?: LayerType) => {
      if (mode === CanvasMode.Inserting) {
        return (
          canvasMode === CanvasMode.Inserting &&
          insertingLayerType === layerType
        );
      }
      return canvasMode === mode;
    };

    const buttonClass = (active: boolean) =>
      `p-2 rounded-lg transition-colors ${
        active
          ? 'bg-primary text-primary-foreground'
          : 'hover:bg-muted text-muted-foreground'
      }`;

    return (
      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex flex-col gap-1 bg-card border border-border rounded-xl p-1.5 shadow-lg z-10">
        <button
          className={buttonClass(isActive(CanvasMode.None))}
          onClick={() => onModeChange(CanvasMode.None)}
          title="Select"
        >
          <MousePointer2 size={18} />
        </button>

        <button
          className={buttonClass(isActive(CanvasMode.Pencil))}
          onClick={() => onModeChange(CanvasMode.Pencil)}
          title="Pen"
        >
          <Pencil size={18} />
        </button>

        <button
          className={buttonClass(
            isActive(CanvasMode.Inserting, LayerType.Rectangle)
          )}
          onClick={() => onModeChange(CanvasMode.Inserting, LayerType.Rectangle)}
          title="Rectangle"
        >
          <Square size={18} />
        </button>

        <button
          className={buttonClass(
            isActive(CanvasMode.Inserting, LayerType.Ellipse)
          )}
          onClick={() => onModeChange(CanvasMode.Inserting, LayerType.Ellipse)}
          title="Ellipse"
        >
          <Circle size={18} />
        </button>

        <button
          className={buttonClass(
            isActive(CanvasMode.Inserting, LayerType.Text)
          )}
          onClick={() => onModeChange(CanvasMode.Inserting, LayerType.Text)}
          title="Text"
        >
          <Type size={18} />
        </button>

        <button
          className={buttonClass(
            isActive(CanvasMode.Inserting, LayerType.Note)
          )}
          onClick={() => onModeChange(CanvasMode.Inserting, LayerType.Note)}
          title="Sticky Note"
        >
          <StickyNote size={18} />
        </button>

        <div className="h-px bg-border my-1" />

        <div className="relative">
          <button
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            onClick={() => setShowColorPicker(!showColorPicker)}
            title="Color"
          >
            <div
              className="w-[18px] h-[18px] rounded-full border border-border"
              style={{
                backgroundColor: `rgb(${selectedColor.r}, ${selectedColor.g}, ${selectedColor.b})`
              }}
            />
          </button>
          {showColorPicker && (
            <div className="absolute left-full ml-2 top-0">
              <ColorPicker
                selectedColor={selectedColor}
                onChange={(c) => {
                  onColorChange(c);
                  setShowColorPicker(false);
                }}
              />
            </div>
          )}
        </div>

        <div className="h-px bg-border my-1" />

        <button
          className={`p-2 rounded-lg transition-colors ${canUndo ? 'hover:bg-muted text-muted-foreground' : 'text-muted-foreground/30'}`}
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo"
        >
          <Undo2 size={18} />
        </button>

        <button
          className={`p-2 rounded-lg transition-colors ${canRedo ? 'hover:bg-muted text-muted-foreground' : 'text-muted-foreground/30'}`}
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo"
        >
          <Redo2 size={18} />
        </button>

        <div className="h-px bg-border my-1" />

        <button
          className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
          onClick={onClear}
          title="Clear board"
        >
          <Trash2 size={18} />
        </button>
      </div>
    );
  }
);

export { Toolbar };
