import { Dialog, DialogContent, DialogTitle } from '@sharkord/ui';
import {
  memo,
  useCallback,
  useEffect,
  useState,
  type MouseEvent,
  type ReactNode
} from 'react';

type TViewOnceViewerProps = {
  file: Blob;
  title: string;
  isVideo: boolean;
  onClose: () => void;
  onCloseAutoFocus: (event: Event) => void;
};

const ViewOnceViewer = memo(
  ({
    file,
    title,
    isVideo,
    onClose,
    onCloseAutoFocus
  }: TViewOnceViewerProps) => {
    const [url, setUrl] = useState<string>();

    useEffect(() => {
      const objectUrl = URL.createObjectURL(file);

      setUrl(objectUrl);

      return () => URL.revokeObjectURL(objectUrl);
    }, [file]);

    const onOpenChange = useCallback(
      (open: boolean) => {
        if (!open) {
          onClose();
        }
      },
      [onClose]
    );

    const onContextMenu = useCallback((event: MouseEvent) => {
      event.preventDefault();
    }, []);

    let media: ReactNode;

    if (isVideo) {
      media = (
        <video
          src={url}
          controls
          autoPlay
          controlsList="nodownload noplaybackrate"
          disablePictureInPicture
          draggable={false}
          className="max-h-[80vh] max-w-full object-contain"
        />
      );
    } else {
      media = (
        <img
          src={url}
          alt={title}
          draggable={false}
          className="max-h-[80vh] max-w-full object-contain"
        />
      );
    }

    return (
      <Dialog open onOpenChange={onOpenChange}>
        <DialogContent
          close={onClose}
          onCloseAutoFocus={onCloseAutoFocus}
          aria-describedby={undefined}
          onContextMenu={onContextMenu}
          className="flex w-max max-w-[90vw] min-w-48 items-center justify-center p-2 pt-12 select-none sm:max-w-[90vw]"
        >
          <DialogTitle className="sr-only">{title}</DialogTitle>
          {media}
        </DialogContent>
      </Dialog>
    );
  }
);

export { ViewOnceViewer };
