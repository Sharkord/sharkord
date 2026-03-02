import { type TextLayer } from '@sharkord/shared';
import { memo, useCallback, useEffect, useRef } from 'react';
import { calculateFontSize, getContrastingTextColor } from '../utils';

type TextProps = {
  layer: TextLayer;
  onPointerDown?: (e: React.PointerEvent) => void;
  selectionColor?: string;
  onValueChange?: (value: string) => void;
  autoFocus?: boolean;
};

const Text = memo(
  ({ layer, onPointerDown, selectionColor, onValueChange, autoFocus }: TextProps) => {
    const { x, y, width, height, fill, value } = layer;
    const contentRef = useRef<HTMLDivElement>(null);

    const handleInput = useCallback(() => {
      if (contentRef.current && onValueChange) {
        onValueChange(contentRef.current.innerText);
      }
    }, [onValueChange]);

    useEffect(() => {
      if (autoFocus && contentRef.current) {
        contentRef.current.focus();
      }
    }, [autoFocus]);

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
          xmlns="http://www.w3.org/1999/xhtml"
          ref={contentRef}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          style={{
            width: '100%',
            height: '100%',
            direction: 'ltr',
            unicodeBidi: 'normal',
            textAlign: 'center',
            lineHeight: `${height}px`,
            fontSize,
            color: getContrastingTextColor(fill),
            outline: 'none',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            whiteSpace: 'pre-wrap'
          }}
        >
          {value || ''}
        </div>
      </foreignObject>
    );
  }
);

export { Text };
