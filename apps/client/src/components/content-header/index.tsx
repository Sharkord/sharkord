import { memo, type ReactNode } from 'react';
import { ChannelListButton } from './channel-list-button';
import { useMainContent } from './context';
import { MainActions } from './main-actions';

type TContentHeaderProps = {
  children?: ReactNode;
  actions?: ReactNode;
};

const ContentHeader = memo(({ children, actions }: TContentHeaderProps) => {
  const mainContent = useMainContent();

  return (
    <div className="flex h-12 shrink-0 items-center gap-2 border-b border-border bg-card px-2 md:px-4">
      {mainContent && (
        <ChannelListButton onClick={mainContent.onOpenChannelList} />
      )}
      <div className="flex min-w-0 flex-1 items-center gap-2">{children}</div>
      <div className="flex shrink-0 items-center gap-3 pointer-coarse:gap-4">
        {actions}
        {mainContent && (
          <MainActions
            onToggleMembers={mainContent.onToggleMembers}
            isMembersOpen={mainContent.isMembersOpen}
          />
        )}
      </div>
    </div>
  );
});

export { ContentHeader };
