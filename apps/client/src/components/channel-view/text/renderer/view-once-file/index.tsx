import { useOwnUserId, useUsernames } from '@/features/server/users/hooks';
import { getUrlFromServer } from '@/helpers/get-file-url';
import { getTokenHeader } from '@/helpers/get-token-header';
import { getTRPCClient } from '@/lib/trpc';
import {
  FileCategory,
  getFileCategory,
  getTrpcError,
  type TFile
} from '@sharkord/shared';
import { Button, Spinner } from '@sharkord/ui';
import { CircleDot, CircleDotDashed } from 'lucide-react';
import {
  memo,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ViewOnceViewer } from './viewer';

const NO_USER_IDS: number[] = [];

const MARKER_CLASS =
  'flex max-w-sm items-center gap-3 rounded-lg border border-border bg-background p-2 select-none';

type TViewOnceFileProps = {
  file: TFile;
  isOwnMessage: boolean;
};

const ViewOnceFile = memo(({ file, isOwnMessage }: TViewOnceFileProps) => {
  const { t } = useTranslation('common');
  const ownUserId = useOwnUserId();
  const [media, setMedia] = useState<Blob>();
  const [openedHere, setOpenedHere] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloadFailed, setDownloadFailed] = useState(false);
  const busyRef = useRef(false);
  const markerRef = useRef<HTMLDivElement>(null);
  const viewedBy = file._viewedBy ?? NO_USER_IDS;
  const usernames = useUsernames();

  const isVideo = useMemo(
    () => getFileCategory(file.extension) === FileCategory.VIDEO,
    [file.extension]
  );

  const openedByMe = useMemo(
    () => ownUserId !== undefined && viewedBy.includes(ownUserId),
    [ownUserId, viewedBy]
  );

  const typeLabel = isVideo ? t('viewOnceVideo') : t('viewOncePhoto');

  const viewersText = useMemo(() => {
    if (!isOwnMessage) return;

    if (viewedBy.length === 0) {
      return t('viewOnceNotOpened');
    }

    const names = viewedBy.map((id) => usernames[id] ?? t('unknownUser'));

    return t('viewOnceOpenedBy', { names: names.join(', ') });
  }, [isOwnMessage, viewedBy, usernames, t]);

  const downloadMedia = useCallback(async () => {
    try {
      const response = await fetch(
        `${getUrlFromServer()}/view-once/${file.id}`,
        { headers: getTokenHeader() }
      );

      if (!response.ok) {
        throw new Error(response.statusText);
      }

      const blob = await response.blob();

      setMedia(blob);
      setDownloadFailed(false);
    } catch {
      setDownloadFailed(true);
      toast.error(t('failedOpenViewOnce'));
    }
  }, [file.id, t]);

  const onOpenClick = useCallback(async () => {
    if (busyRef.current) return;

    busyRef.current = true;
    setLoading(true);

    try {
      if (!downloadFailed) {
        const trpc = getTRPCClient();

        await trpc.messages.openViewOnce.mutate({ fileId: file.id });
        setOpenedHere(true);
      }

      await downloadMedia();
    } catch (error) {
      toast.error(getTrpcError(error, t('failedOpenViewOnce')));
    } finally {
      busyRef.current = false;
      setLoading(false);
    }
  }, [downloadFailed, downloadMedia, file.id, t]);

  const onViewerClose = useCallback(() => {
    setMedia(undefined);
  }, []);

  const onViewerCloseAutoFocus = useCallback((event: Event) => {
    event.preventDefault();
    markerRef.current?.focus();
  }, []);

  const showOpened = (openedByMe || openedHere) && !loading && !downloadFailed;

  let marker: ReactNode;

  if (isOwnMessage) {
    marker = (
      <div className={MARKER_CLASS}>
        <CircleDotDashed className="h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-medium text-foreground">
            {typeLabel}
          </span>
          <span className="wrap-anywhere text-xs text-muted-foreground">
            {viewersText}
          </span>
        </div>
      </div>
    );
  } else if (showOpened) {
    marker = (
      <div ref={markerRef} tabIndex={-1} className={MARKER_CLASS}>
        <CircleDot className="h-5 w-5 shrink-0 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          {t('viewOnceOpened')}
        </span>
      </div>
    );
  } else {
    marker = (
      <Button variant="outline" onClick={onOpenClick} disabled={loading}>
        {loading ? <Spinner size="xxs" /> : <CircleDotDashed />}
        {downloadFailed ? t('retry') : typeLabel}
      </Button>
    );
  }

  return (
    <>
      {marker}
      {media && (
        <ViewOnceViewer
          file={media}
          title={typeLabel}
          isVideo={isVideo}
          onClose={onViewerClose}
          onCloseAutoFocus={onViewerCloseAutoFocus}
        />
      )}
    </>
  );
});

export { ViewOnceFile };
