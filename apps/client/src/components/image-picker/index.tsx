import { getFileUrl } from '@/helpers/get-file-url';
import { cn } from '@/lib/utils';
import type { TFile } from '@sharkord/shared';
import { Upload } from 'lucide-react';
import { memo } from 'react';
import { Button, buttonVariants } from '@sharkord/ui';

type TImagePickerProps = {
  onImageClick: () => Promise<void>;
  onRemoveImageClick?: () => Promise<void>;
  image: TFile | null;
  className?: string;
};

const ImagePicker = memo(
  ({
    onImageClick,
    onRemoveImageClick,
    image,
    className
  }: TImagePickerProps) => {
    return (
      <>
        <div className="space-y-2">
          <div
            className={cn('relative group cursor-pointer w-80 h-24', className)}
            onClick={onImageClick}
          >
            {image ? (
              <img
                src={getFileUrl(image)}
                alt="Image"
                className={cn(
                  'w-80 h-24 object-cover rounded-md transition-opacity group-hover:opacity-70',
                  className
                )}
              />
            ) : (
              <div
                className={cn(
                  buttonVariants({ variant: 'outline' }),
                  'w-80 h-24 cursor-pointer transition-opacity group-hover:opacity-70',
                  className
                )}
              />
            )}
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-md">
              <div className="bg-black/50 rounded-full p-3">
                <Upload className="h-6 w-6 text-white" />
              </div>
            </div>
          </div>
        </div>
        {image && (
          <div>
            <Button size="sm" variant="outline" onClick={onRemoveImageClick}>
              Remove image
            </Button>
          </div>
        )}
      </>
    );
  }
);

export { ImagePicker };
