import { type TextLayer } from '@sharkord/shared';
import { memo, useCallback, useEffect, useRef } from 'react';
import { calculateFontSize, getContrastingTextColor } from '../utils';

type TextProps = {
  layer: TextLayer;
  onPointerDown?: (e: React.PointerEvent) => void;
  selectionColor?: string;
  onValueChange?: (value: string) => void;
  isEditing?: boolean;
};

const Text = memo(
  ({ layer, onPointerDown, selectionColor, onValueChange, isEditing }: TextProps) => {
    const { x, y, width, height, fill, value } = layer;
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        onValueChange?.(e.target.value);
      },
      [onValueChange]
    );

    useEffect(() => {
      if (isEditing && textareaRef.current) {
        textareaRef.current.focus();
      }
    }, [isEditing]);

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
        <textarea
          ref={textareaRef}
          dir="ltr"
          readOnly={!isEditing}
          value={value || ''}
          onChange={handleChange}
          style={{
            width: '100%',
            height: '100%',
            textAlign: 'center',
            fontSize,
            color: getContrastingTextColor(fill),
            background: 'transparent',
            border: 'none',
            outline: 'none',
            resize: 'none',
            overflow: 'hidden',
            padding: 0,
            margin: 0,
            fontFamily: 'inherit',
            lineHeight: `${height}px`,
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            pointerEvents: isEditing ? 'auto' : 'none',
            cursor: isEditing ? 'text' : 'default'
          }}
        />
      </foreignObject>
    );
  }
);

export { Text };
