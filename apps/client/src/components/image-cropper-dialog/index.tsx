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
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import { getCroppedImage } from './get-cropped-image';

type TImageCropperDialogProps = {
  open: boolean;
  onClose: () => void;
  imageSrc: string;
  aspect: number;
  cropShape?: 'rect' | 'round';
  onConfirm: (file: File) => void;
  title?: string;
};

const ImageCropperDialog = ({
  open,
  onClose,
  imageSrc,
  aspect,
  cropShape = 'rect',
  onConfirm,
  title = 'Crop Image'
}: TImageCropperDialogProps) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

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
      <DialogContent className="sm:max-w-lg" close={handleClose}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="relative w-full h-72 bg-black rounded-md overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={cropShape}
            showGrid={false}
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
            Cancel
          </Button>
          <Button onClick={handleConfirm}>Apply</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export { ImageCropperDialog };
