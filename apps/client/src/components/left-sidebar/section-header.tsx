import { memo, type ReactNode } from 'react';

type TSectionHeaderProps = {
  title: string;
  children?: ReactNode;
};

const SectionHeader = memo(({ title, children }: TSectionHeaderProps) => (
  <div className="mb-1 flex items-center justify-between px-2 py-1">
    <span className="text-xs font-semibold text-muted-foreground">{title}</span>
    {children}
  </div>
));

export { SectionHeader };
