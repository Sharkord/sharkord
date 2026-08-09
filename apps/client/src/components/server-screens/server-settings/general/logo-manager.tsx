import { ImagePicker } from '@/components/image-picker';
import { useImageManager } from '@/hooks/use-image-manager';
import type { TFile } from '@sharkord/shared';
import { Group } from '@sharkord/ui';
import { memo } from 'react';

type TLogoManagerProps = {
  logo: TFile | null;
  refetch: () => Promise<void>;
};

const LogoManager = memo(({ logo, refetch }: TLogoManagerProps) => {
  const { onPick, onRemove } = useImageManager('logo', refetch);

  return (
    <Group
      label="Logo"
      description="Square image is recommended. If your image is not perfectly square, the PWA icons will fall back to the default Sharkord icon."
    >
      <ImagePicker
        image={logo}
        onImageClick={onPick}
        onRemoveImageClick={onRemove}
        className="object-scale-down"
      />
    </Group>
  );
});

export { LogoManager };
