import { memo, type ReactNode } from 'react';

type TContentHeaderTitleProps = {
  icon: ReactNode;
  children: ReactNode;
};

const ContentHeaderTitle = memo(
  ({ icon, children }: TContentHeaderTitleProps) => (
    <>
      <span className="flex shrink-0 text-muted-foreground [&>svg]:size-4">
        {icon}
      </span>
      <span className="min-w-0 truncate font-bold">{children}</span>
    </>
  )
);

export { ContentHeaderTitle };
