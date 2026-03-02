import { type TextLayer } from '@sharkord/shared';
import { memo, useCallback, useRef } from 'react';
import { calculateFontSize, colorToCss, getContrastingTextColor } from '../utils';

type TextProps = {
  layer: TextLayer;
  onPointerDown?: (e: React.PointerEvent) => void;
  selectionColor?: string;
  onValueChange?: (value: string) => void;
};

const Text = memo(
  ({ layer, onPointerDown, selectionColor, onValueChange }: TextProps) => {
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
            overflowWrap: 'break-word'
          }}
        >
          {value || ''}
        </div>
      </foreignObject>
    );
  }
);

export { Text };
