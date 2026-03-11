import { ImageCropperDialog } from '@/components/image-cropper-dialog';
import { ImagePicker } from '@/components/image-picker';
import { uploadFile } from '@/helpers/upload-file';
import { useFilePicker } from '@/hooks/use-file-picker';
import { getTRPCClient } from '@/lib/trpc';
import type { TFile } from '@sharkord/shared';
import { Group } from '@sharkord/ui';
import { memo, useCallback, useState } from 'react';
import { toast } from 'sonner';

type TLogoManagerProps = {
  logo: TFile | null;
  refetch: () => Promise<void>;
};

const LogoManager = memo(({ logo, refetch }: TLogoManagerProps) => {
  const openFilePicker = useFilePicker();
  const [cropperOpen, setCropperOpen] = useState(false);
  const [pendingImageSrc, setPendingImageSrc] = useState<string | null>(null);

  const removeLogo = useCallback(async () => {
    const trpc = getTRPCClient();

    try {
      await trpc.others.changeLogo.mutate({ fileId: undefined });
      await refetch();

      toast.success('Logo removed successfully!');
    } catch (error) {
      console.error(error);
      toast.error('Could not remove logo. Please try again.');
    }
  }, [refetch]);

  const onLogoClick = useCallback(async () => {
    try {
      const [file] = await openFilePicker('image/*');

      const reader = new FileReader();
      reader.onload = () => {
        setPendingImageSrc(reader.result as string);
        setCropperOpen(true);
      };
      reader.readAsDataURL(file);
    } catch {
      // user cancelled
    }
  }, [openFilePicker]);

  const onCropConfirm = useCallback(
    async (croppedFile: File) => {
      const trpc = getTRPCClient();

      try {
        const temporaryFile = await uploadFile(croppedFile);

        if (!temporaryFile) {
          toast.error('Could not upload file. Please try again.');
          return;
        }

        await trpc.others.changeLogo.mutate({ fileId: temporaryFile.id });
        await refetch();

        toast.success('Logo updated successfully!');
      } catch {
        toast.error('Could not update logo. Please try again.');
      } finally {
        setPendingImageSrc(null);
      }
    },
    [refetch]
  );

  return (
    <>
      <Group
        label="Logo"
        description="Recommended max resolution: 1200x400 or 1024x1024."
      >
        <ImagePicker
          image={logo}
          onImageClick={onLogoClick}
          onRemoveImageClick={removeLogo}
          className="w-48 h-48"
        />
      </Group>

      {pendingImageSrc && (
        <ImageCropperDialog
          open={cropperOpen}
          onClose={() => {
            setCropperOpen(false);
            setPendingImageSrc(null);
          }}
          imageSrc={pendingImageSrc}
          aspect={1}
          cropShape="rect"
          title="Crop Logo"
          onConfirm={onCropConfirm}
        />
      )}
    </>
  );
});

export { LogoManager };
