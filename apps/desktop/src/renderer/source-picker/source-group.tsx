import { memo } from 'react';
import type { TPickableSource } from '../../shared/types';
import { SourceTile } from './source-tile';

type TSourceGroupProps = {
  title: string;
  sources: TPickableSource[];
  onPick: (sourceId: string) => void;
};

const SourceGroup = memo(({ title, sources, onPick }: TSourceGroupProps) => {
  if (sources.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      <div className="grid grid-cols-3 gap-3">
        {sources.map((source) => (
          <SourceTile key={source.id} source={source} onPick={onPick} />
        ))}
      </div>
    </section>
  );
});

export { SourceGroup };
