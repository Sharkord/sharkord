import { type NoteLayer } from '@sharkord/shared';
import { memo, useCallback, useRef } from 'react';
import { calculateFontSize, colorToCss, getContrastingTextColor } from '../utils';

type NoteProps = {
  layer: NoteLayer;
  onPointerDown?: (e: React.PointerEvent) => void;
  selectionColor?: string;
  onValueChange?: (value: string) => void;
};

const Note = memo(
  ({ layer, onPointerDown, selectionColor, onValueChange }: NoteProps) => {
    const { x, y, width, height, fill, value } = layer;
    const contentRef = useRef<HTMLDivElement>(null);

    const handleInput = useCallback(() => {
      if (contentRef.current && onValueChange) {
        onValueChange(contentRef.current.innerText);
      }
    }, [onValueChange]);

    const fontSize = calculateFontSize(width, height);

    return (
      <foreignObject
        x={x}
        y={y}
        width={width}
        height={height}
        onPointerDown={onPointerDown}
        style={{
          outline: selectionColor ? `1px solid ${selectionColor}` : 'none'
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: colorToCss(fill),
            borderRadius: 4,
            padding: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
        >
          <div
            ref={contentRef}
            contentEditable
            suppressContentEditableWarning
            onInput={handleInput}
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize,
              color: getContrastingTextColor(fill),
              outline: 'none',
              wordBreak: 'break-word',
              overflowWrap: 'break-word',
              textAlign: 'center'
            }}
          >
            {value || ''}
          </div>
        </div>
      </foreignObject>
    );
  }
);

export { Note };
