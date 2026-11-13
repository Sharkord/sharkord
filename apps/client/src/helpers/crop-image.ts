import type { Area } from 'react-easy-crop';

// an undefined aspect keeps the image's own aspect ratio
export type TImageCropOptions = {
  shape: 'round' | 'rect';
  aspect?: number;
};

export type TRequestImageCrop = (
  request: TImageCropOptions & { file: File }
) => Promise<File | null>;

export const AVATAR_CROP: TImageCropOptions = { shape: 'round', aspect: 1 };
export const BANNER_CROP: TImageCropOptions = { shape: 'rect', aspect: 10 / 3 };
export const LOGO_CROP: TImageCropOptions = { shape: 'rect' };

export const isCroppableImage = (type: string, bytes: Uint8Array) => {
  if (type === 'image/gif' || type === 'image/svg+xml') return false;

  const marker: Record<string, string> = {
    'image/png': 'acTL',
    'image/apng': 'acTL',
    'image/webp': 'ANIM'
  };

  if (!marker[type]) return true;

  const decoder = new TextDecoder('latin1');
  const text = decoder.decode(bytes);

  return !text.includes(marker[type]);
};

export const cropImage = async (file: File, area: Area): Promise<File> => {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement('canvas');

  canvas.width = area.width;
  canvas.height = area.height;

  const context = canvas.getContext('2d');

  if (!context) throw new Error('Canvas is not available');

  context.drawImage(
    bitmap,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    area.width,
    area.height
  );

  bitmap.close();

  const type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, 0.92)
  );

  if (!blob) throw new Error('Failed to crop image');

  const extension = type === 'image/jpeg' ? 'jpg' : 'png';
  const baseName = file.name.replace(/\.[^.]+$/, '');

  return new File([blob], `${baseName}.${extension}`, { type });
};

export const cropPickedImage = async (
  file: File,
  options: TImageCropOptions | undefined,
  requestCrop: TRequestImageCrop
): Promise<File | undefined> => {
  if (!options) return file;

  const bytes = new Uint8Array(await file.arrayBuffer());

  if (!isCroppableImage(file.type, bytes)) return file;

  const cropped = await requestCrop({ file, ...options });

  return cropped ?? undefined;
};
