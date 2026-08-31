import { usePickImage, type TPickedImage } from '@/hooks/use-pick-image';
import { cn } from '@/lib/utils';
import { Button, buttonVariants, Group } from '@sharkord/ui';
import { Upload } from 'lucide-react';
import { memo, useCallback, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type TImagePickerProps = {
  label: string;
  currentUrl: string;
  // undefined means untouched, null means the image is being removed
  draft: TPickedImage | null | undefined;
  onChange: (picked: TPickedImage | null) => void;
  description?: string;
  className?: string;
  fallback?: ReactNode;
};

const ImagePicker = memo(
  ({
    label,
    currentUrl,
    draft,
    onChange,
    description,
    className,
    fallback
  }: TImagePickerProps) => {
    const { t } = useTranslation('common');
    const pickImage = usePickImage();

    const handlePick = useCallback(async () => {
      const picked = await pickImage();

      if (picked) onChange(picked);
    }, [pickImage, onChange]);

    const handleRemove = useCallback(() => onChange(null), [onChange]);

    let previewUrl = currentUrl;

    if (draft !== undefined) {
      previewUrl = draft?.previewUrl ?? '';
    }

    let preview = fallback ?? (
      <div
        className={cn(
          buttonVariants({ variant: 'outline' }),
          'h-24 w-80 cursor-pointer',
          className
        )}
      />
    );

    if (previewUrl) {
      preview = (
        <img
          src={previewUrl}
          alt=""
          className={cn(
            'h-24 w-80 rounded-md bg-muted object-cover',
            className
          )}
        />
      );
    }

    return (
      <Group label={label} description={description}>
        <div
          className={cn(
            'group relative h-24 w-80 cursor-pointer transition-opacity',
            className
          )}
          onClick={handlePick}
        >
          {preview}
          <div className="absolute inset-0 flex items-center justify-center rounded-md opacity-0 transition-opacity group-hover:opacity-100">
            <div className="rounded-full bg-black/50 p-3">
              <Upload className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>

        {previewUrl && (
          <div>
            <Button size="sm" variant="outline" onClick={handleRemove}>
              {t('removeImage')}
            </Button>
          </div>
        )}
      </Group>
    );
  }
);

export { ImagePicker };
