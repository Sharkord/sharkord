import Spinner from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import { FileCategory, FileStatus, getFileCategory } from '@sharkord/shared';
import { Button } from '@sharkord/ui';
import { filesize } from 'filesize';
import {
  File,
  FileImage,
  FileMusic,
  FileText,
  FileVideo,
  Trash
} from 'lucide-react';
import { memo, useCallback, useMemo } from 'react';

type TFileIconProps = {
  extension: string;
  loading: boolean;
};

const categoryMap: Record<FileCategory, React.ElementType> = {
  [FileCategory.AUDIO]: FileMusic,
  [FileCategory.IMAGE]: FileImage,
  [FileCategory.VIDEO]: FileVideo,
  [FileCategory.DOCUMENT]: FileText,
  [FileCategory.OTHER]: File
};

const FileIcon = memo(({ extension, loading }: TFileIconProps) => {
  const category = useMemo(() => getFileCategory(extension), [extension]);
  const className = 'h-5 w-5 text-muted-foreground';

  let Icon = categoryMap[category] || File;
  if (loading) Icon = Spinner;

  return <Icon className={className} />;
});

type TFileCardProps = {
  name: string;
  size: number | null;
  extension: string;
  href?: string;
  status?: number;
  onRemove?: () => void;
};

const FileCard = ({
  name,
  size,
  extension,
  href,
  status,
  onRemove
}: TFileCardProps) => {
  const onRemoveClick = useCallback(
    (e: React.MouseEvent) => {
      if (onRemove) {
        e.preventDefault();
        onRemove();
      }
    },
    [onRemove]
  );

  const loading = status === FileStatus.Processing;
  let fileSizeText: string;
  if (loading) {
    fileSizeText = '';
    href = '#';
    name = 'Processing...';
    setInterval(() => {name = name + '.'}, 1000);
  } else {
    fileSizeText = filesize(size || 0);
  }

  return (
    <a
      className="flex max-w-sm items-center gap-3 rounded-lg border border-border bg-background p-2 select-none transition-all duration-200 hover:border-primary/50 hover:bg-accent hover:shadow-md"
      href={href}
      target="_blank"
    >
      <div className="flex shrink-0 items-center justify-center rounded-md bg-muted p-2 transition-colors duration-200">
        <FileIcon extension={extension} loading={loading}/>
      </div>
      <div className="flex flex-1 flex-col overflow-hidden">
        <span
          className={cn(
            'truncate text-sm font-medium text-foreground transition-colors duration-200'
          )}
        >
          {name}
        </span>
        <span className="text-xs text-muted-foreground">{fileSizeText}</span>
      </div>
      {onRemove && !loading && (
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 shrink-0 transition-opacity duration-200"
          onClick={onRemoveClick}
        >
          <Trash className="h-4 w-4" />
        </Button>
      )}
    </a>
  );
};

export { FileCard };
