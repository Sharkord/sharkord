import { memo, useCallback } from 'react';
import type { TPickableSource } from '../../shared/types';

type TSourceTileProps = {
  source: TPickableSource;
  onPick: (sourceId: string) => void;
};

const SourceTile = memo(({ source, onPick }: TSourceTileProps) => {
  const handleClick = useCallback(() => {
    onPick(source.id);
  }, [onPick, source.id]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex flex-col gap-2 rounded-md border border-border bg-card p-2 text-left transition-colors hover:border-primary focus-visible:border-primary focus-visible:outline-none"
    >
      <img
        src={source.thumbnail}
        alt=""
        className="aspect-video w-full rounded-sm bg-black object-contain"
      />
      <span className="truncate text-sm">{source.name}</span>
    </button>
  );
});

export { SourceTile };
