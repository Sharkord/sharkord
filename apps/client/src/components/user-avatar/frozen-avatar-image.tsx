import { memo, useEffect, useRef } from 'react';

type TFrozenAvatarImageProps = {
  src: string;
};

// canvas drawImage always paints the first frame of an animated image
const FrozenAvatarImage = memo(({ src }: TFrozenAvatarImageProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const image = new Image();

    image.onload = () => {
      const canvas = canvasRef.current;

      if (!canvas) return;

      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;

      const context = canvas.getContext('2d');

      if (!context) return;

      context.drawImage(image, 0, 0, canvas.width, canvas.height);
    };

    image.src = src;

    return () => {
      image.onload = null;
    };
  }, [src]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 size-full group-hover/avatar:invisible"
    />
  );
});

export { FrozenAvatarImage };
