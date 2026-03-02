import { type Color } from '@sharkord/shared';
import { memo } from 'react';
import { colorToCss, colors } from './utils';

type ColorPickerProps = {
  selectedColor: Color;
  onChange: (color: Color) => void;
};

const ColorPicker = memo(({ selectedColor, onChange }: ColorPickerProps) => {
  return (
    <div className="flex flex-wrap gap-1 p-2 bg-card border border-border rounded-lg shadow-lg">
      {colors.map((color, i) => {
        const isSelected =
          color.r === selectedColor.r &&
          color.g === selectedColor.g &&
          color.b === selectedColor.b;

        return (
          <button
            key={i}
            className="w-6 h-6 rounded-full border-2 transition-transform hover:scale-110"
            style={{
              backgroundColor: colorToCss(color),
              borderColor: isSelected ? '#3b82f6' : 'transparent'
            }}
            onClick={() => onChange(color)}
          />
        );
      })}
    </div>
  );
});

export { ColorPicker };
