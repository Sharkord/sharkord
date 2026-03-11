import { cn } from '@/lib/utils';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Slider
} from '@sharkord/ui';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { useCallback, useState } from 'react';
import type { Area, Point } from 'react-easy-crop';
import Cropper from 'react-easy-crop';
import { useTranslation } from 'react-i18next';
import { getCroppedImage } from './get-cropped-image';

type TImageCropperDialogProps = {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  aspect: number;
  variant?: 'default' | 'wide';
  cropShape?: 'rect' | 'round';
  onConfirm: (file: File) => void;
  title?: string;
};

const ImageCropperDialog = ({
  open,
  onClose,
  imageSrc,
  aspect,
  variant = 'default',
  cropShape = 'rect',
  onConfirm,
  title
}: TImageCropperDialogProps) => {
  const { t } = useTranslation('dialogs');
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const isWide = variant === 'wide';

  const onCropComplete = useCallback((_: Area, croppedArea: Area) => {
    setCroppedAreaPixels(croppedArea);
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!croppedAreaPixels) return;

    const file = await getCroppedImage(imageSrc, croppedAreaPixels);
    onConfirm(file);
    onClose();
  }, [croppedAreaPixels, imageSrc, onConfirm, onClose]);

  const handleClose = useCallback(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    onClose();
  }, [onClose]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent
        className={cn(
          'data-[state=open]:animate-none data-[state=closed]:animate-none',
          isWide ? 'w-[85vw] sm:max-w-4xl p-4 gap-3' : 'sm:max-w-lg'
        )}
        close={handleClose}
      >
        <DialogHeader>
          <DialogTitle>{title ?? t('cropImageTitle')}</DialogTitle>
        </DialogHeader>

        <div
          className={cn(
            'relative w-full bg-black rounded-md overflow-hidden',
            isWide ? 'h-72' : 'h-96'
          )}
        >
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={cropShape}
            showGrid={false}
            minZoom={1}
            objectFit={isWide ? 'cover' : 'contain'}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="flex items-center gap-3 px-1">
          <ZoomOut className="h-4 w-4 shrink-0 text-muted-foreground" />
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.01}
            onValueChange={([val]) => setZoom(val)}
            className="flex-1"
          />
          <ZoomIn className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {t('cancel')}
          </Button>
          <Button onClick={handleConfirm}>{t('apply')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { ImageCropperDialog };
