import { memo, useEffect, useRef } from 'react';

type TFrozenImageProps = {
  src: string;
  className?: string;
};

const FrozenImage = memo(({ src, className }: TFrozenImageProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const image = new Image();

    image.onload = () => {
      const canvas = canvasRef.current;

      if (!canvas) return;

      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const context = canvas.getContext('2d');

      if (!context) return;

      context.drawImage(image, 0, 0);
    };

    image.src = src;

    return () => {
      image.onload = null;
    };
  }, [src]);

  return <canvas ref={canvasRef} className={className} />;
});

export { FrozenImage };
