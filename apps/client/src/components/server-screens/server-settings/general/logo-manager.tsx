import { ImagePicker } from '@/components/image-picker';
import { uploadFile } from '@/helpers/upload-file';
import { useFilePicker } from '@/hooks/use-file-picker';
import { getTRPCClient } from '@/lib/trpc';
import type { TFile } from '@sharkord/shared';
import { Group } from '@sharkord/ui';
import { memo, useCallback } from 'react';
import { toast } from 'sonner';

type TLogoManagerProps = {
  logo: TFile | null;
  refetch: () => Promise<void>;
};

const LogoManager = memo(({ logo, refetch }: TLogoManagerProps) => {
  const openFilePicker = useFilePicker();

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
    const trpc = getTRPCClient();

    try {
      const [file] = await openFilePicker('image/*');

      const temporaryFile = await uploadFile(file);

      if (!temporaryFile) {
        toast.error('Could not upload file. Please try again.');
        return;
      }

      await trpc.others.changeLogo.mutate({ fileId: temporaryFile.id });
      await refetch();

      toast.success('Logo updated successfully!');
    } catch {
      toast.error('Could not update logo. Please try again.');
    }
  }, [openFilePicker, refetch]);

  return (
    <Group label="Logo">
      <ImagePicker
        image={logo}
        onImageClick={onLogoClick}
        onRemoveImageClick={removeLogo}
        className="w-48 h-48"
      />
    </Group>
  );
});

export { LogoManager };
