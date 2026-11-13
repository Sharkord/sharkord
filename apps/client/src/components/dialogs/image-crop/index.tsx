import { cropImage, type TImageCropOptions } from '@/helpers/crop-image';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Slider
} from '@sharkord/ui';
import { memo, useCallback, useEffect, useState } from 'react';
import Cropper, {
  type Area,
  type MediaSize,
  type Point
} from 'react-easy-crop';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { TDialogBaseProps } from '../types';

type TImageCropDialogProps = TDialogBaseProps &
  TImageCropOptions & {
    file: File;
    onConfirm: (file: File) => void;
    onCancel: () => void;
  };

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

const ImageCropDialog = memo(
  ({
    isOpen,
    file,
    shape,
    aspect,
    onConfirm,
    onCancel
  }: TImageCropDialogProps) => {
    const { t } = useTranslation('dialogs');
    const [imageUrl, setImageUrl] = useState<string>();
    const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(MIN_ZOOM);
    const [mediaAspect, setMediaAspect] = useState<number>();
    const [area, setArea] = useState<Area>();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      const url = URL.createObjectURL(file);

      setImageUrl(url);

      return () => URL.revokeObjectURL(url);
    }, [file]);

    const handleMediaLoaded = useCallback(
      ({ naturalWidth, naturalHeight }: MediaSize) => {
        setMediaAspect(naturalWidth / naturalHeight);
      },
      []
    );

    const handleCropComplete = useCallback((_: Area, pixels: Area) => {
      setArea(pixels);
    }, []);

    const handleZoomSliderChange = useCallback(([value]: number[]) => {
      setZoom(value);
    }, []);

    const handleConfirm = useCallback(async () => {
      if (!area) return;

      setLoading(true);

      try {
        const cropped = await cropImage(file, area);

        onConfirm(cropped);
      } catch {
        toast.error(t('failedCropImage'));
      } finally {
        setLoading(false);
      }
    }, [area, file, onConfirm, t]);

    return (
      <AlertDialog open={isOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('cropImageTitle')}</AlertDialogTitle>
          </AlertDialogHeader>
          <div className="relative h-80 w-full overflow-hidden rounded-md bg-muted">
            {imageUrl && (
              <Cropper
                image={imageUrl}
                crop={crop}
                zoom={zoom}
                minZoom={MIN_ZOOM}
                maxZoom={MAX_ZOOM}
                aspect={aspect ?? mediaAspect}
                cropShape={shape}
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleCropComplete}
                onMediaLoaded={handleMediaLoaded}
              />
            )}
          </div>
          <Slider
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.01}
            value={[zoom]}
            onValueChange={handleZoomSliderChange}
            aria-label={t('cropImageZoom')}
          />
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel onClick={onCancel} disabled={loading}>
              {t('cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={!area || loading}
            >
              {t('confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
);

export { ImageCropDialog };
