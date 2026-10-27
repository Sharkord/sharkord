import type { DesktopCapturerSource, WebContents } from 'electron';
import { IpcChannel } from '../../shared/constants';
import type { TPickableSource } from '../../shared/types';

const JPEG_QUALITY = 70;

type TPendingPick = {
  requestId: number;
  sourceIds: Set<string>;
  resolve: (sourceId: string | null) => void;
};

const toPickableSource = (source: DesktopCapturerSource): TPickableSource => {
  const jpeg = source.thumbnail.toJPEG(JPEG_QUALITY);

  return {
    id: source.id,
    name: source.name,
    kind: source.id.startsWith('screen:') ? 'screen' : 'window',
    thumbnail: `data:image/jpeg;base64,${jpeg.toString('base64')}`
  };
};

const createSourcePicker = (
  shellContents: WebContents,
  setOpen: (open: boolean) => void
) => {
  let pending: TPendingPick | null = null;
  let nextRequestId = 0;

  const finish = (sourceId: string | null) => {
    if (!pending) {
      return;
    }

    const { resolve } = pending;

    pending = null;
    setOpen(false);
    resolve(sourceId);
  };

  const pick = (sources: DesktopCapturerSource[]) =>
    new Promise<string | null>((resolve) => {
      finish(null);

      nextRequestId += 1;

      const requestId = nextRequestId;

      pending = {
        requestId,
        sourceIds: new Set(sources.map(({ id }) => id)),
        resolve
      };

      setOpen(true);
      shellContents.send(IpcChannel.SOURCE_PICK_REQUESTED, {
        requestId,
        sources: sources.map(toPickableSource)
      });
    });

  const answer = (requestId: number, sourceId: string | null) => {
    if (!pending || pending.requestId !== requestId) {
      return;
    }

    const isOffered = sourceId !== null && pending.sourceIds.has(sourceId);

    finish(isOffered ? sourceId : null);
  };

  const cancel = () => {
    finish(null);
  };

  return { pick, answer, cancel };
};

type TSourcePicker = ReturnType<typeof createSourcePicker>;

export { createSourcePicker };
export type { TSourcePicker };
