import { memo, useCallback, useState } from 'react';
import { extractImagePalette } from '../lib/extract-image-palette';
import { cn } from '../lib/utils';

type TImageSwatchPickerProps = {
  src: string;
  onChange?: (value: string) => void;
};

const ImageSwatchPicker = memo(({ src, onChange }: TImageSwatchPickerProps) => {
  const [swatches, setSwatches] = useState<string[]>([]);

  const handleLoad = useCallback(
    (event: React.SyntheticEvent<HTMLImageElement>) => {
      setSwatches(extractImagePalette(event.currentTarget));
    },
    []
  );

  const handleError = useCallback(() => setSwatches([]), []);

  const handleSelect = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      onChange?.(event.currentTarget.value);
    },
    [onChange]
  );

  if (!src) return null;

  return (
    <div>
      <img
        src={src}
        crossOrigin="anonymous"
        onLoad={handleLoad}
        onError={handleError}
        className="hidden"
        alt=""
      />

      <div className="flex flex-wrap gap-2">
        {swatches.map((color) => (
          <button
            key={color}
            type="button"
            value={color}
            onClick={handleSelect}
            title={color}
            aria-label={color}
            className={cn(
              'size-8 rounded-lg cursor-pointer transition-transform hover:scale-110',
              'outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
            style={{ background: color }}
          />
        ))}
      </div>
    </div>
  );
});

ImageSwatchPicker.displayName = 'ImageSwatchPicker';

export { ImageSwatchPicker };
