import { Separator } from '@sharkord/ui';
import type { ReactNode } from 'react';

type TListWithSeparatorsProps<T> = {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => ReactNode;
};

const ListWithSeparators = <T,>({
  items,
  getKey,
  renderItem
}: TListWithSeparatorsProps<T>) => {
  return (
    <div className="space-y-3">
      {items.map((item, index) => (
        <div key={getKey(item)}>
          {renderItem(item)}
          {index < items.length - 1 && <Separator className="mt-3" />}
        </div>
      ))}
    </div>
  );
};

export { ListWithSeparators };
