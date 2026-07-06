import { useEffect, useRef, useState } from 'react';
import { kmeans, rgbToHex } from '../lib/utils';

type RGB = [number, number, number];
type TImageSwatchExtractNSelectProps = {
  src: string;
  onChange?: (value: string) => void;
  className?: string;
};

const ImageSwatchExtractNSelect = ({
  src,
  onChange,
  className = ''
}: TImageSwatchExtractNSelectProps) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [swatches, setSwatches] = useState<string[]>();

  useEffect(() => {
    if (!src) return;

    const load = async () => {
      const res = await fetch(src);
      const blob = await res.blob();

      const blobUrl = URL.createObjectURL(blob);
      setImageUrl(blobUrl);
    };

    load();
  }, [src]);

  const extractPalette = () => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    canvas.width = 100;
    canvas.height = (img.naturalHeight / img.naturalWidth) * 100;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    if (!data) return;

    const pixels: RGB[] = [];

    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3] ?? 255;
      if (a < 125) continue;

      pixels.push([data[i] ?? 0, data[i + 1] ?? 0, data[i + 2] ?? 0]);
    }

    const palette = kmeans(pixels, 6).map(([r, g, b]) => rgbToHex(r, g, b));

    setSwatches(palette);
  };

  return (
    <div className={className}>
      <img
        ref={imageRef}
        src={imageUrl || ''}
        onLoad={extractPalette}
        style={{ display: 'none' }}
      />
      {/* Canvas is needed to extract colors client side. */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
        {swatches?.map((color) => (
          <div
            key={color}
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: color,
              cursor: 'pointer',
              transition: 'transform 0.1s ease'
            }}
            onClick={() => onChange?.(color)}
            onMouseEnter={(e) =>
              (e.currentTarget.style.transform = 'scale(1.1)')
            }
            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            title={color}
          />
        ))}
      </div>
    </div>
  );
};

export { ImageSwatchExtractNSelect };
