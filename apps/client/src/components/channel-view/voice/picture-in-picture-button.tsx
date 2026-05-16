import { IconButton } from '@sharkord/ui';
import { PictureInPicture2 } from 'lucide-react';
import { memo, type RefObject } from 'react';
import { usePictureInPicture } from './hooks/use-picture-in-picture';

type TPictureInPictureButtonProps = {
  videoRef: RefObject<HTMLVideoElement | null>;
  enabled?: boolean;
};

const PictureInPictureButton = memo(
  ({ videoRef, enabled = true }: TPictureInPictureButtonProps) => {
    const { isSupported, isActive, togglePictureInPicture } =
      usePictureInPicture(videoRef, enabled);

    if (!isSupported) return null;

    return (
      <IconButton
        type="button"
        variant={isActive ? 'default' : 'ghost'}
        icon={PictureInPicture2}
        onClick={togglePictureInPicture}
        title={isActive ? 'Exit Picture-in-Picture' : 'Picture-in-Picture'}
        size="sm"
      />
    );
  }
);

export { PictureInPictureButton };
