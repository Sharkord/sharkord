import { closeThreadSidebar } from '@/features/app/actions';
import { IconButton } from '@sharkord/ui';
import { MessageSquareText, X } from 'lucide-react';
import { memo } from 'react';

const ThreadHeader = memo(() => {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
      <div className="flex items-center gap-2">
        <MessageSquareText className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold text-sm">Thread</span>
      </div>
      <IconButton
        onClick={closeThreadSidebar}
        icon={X}
        variant="ghost"
        size="sm"
        className="rounded-md hover:bg-accent transition-colors"
      />
    </div>
  );
});

export { ThreadHeader };
