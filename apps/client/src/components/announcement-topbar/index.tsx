import { useSelectedChannel } from '@/features/server/channels/hooks';
import { cn } from '@/lib/utils';
import { memo } from 'react';

const AnnouncementTopbar = memo(() => {

    const selectedChannel = useSelectedChannel();
    const announcementMessage = selectedChannel?.topic || null;

    return (
      <aside
        className={cn(
          'sticky inset-0 pointer-events-none',
          'bg-neutral-800 rounded-xl shadow-md border border-neutral-700 mx-2 mt-2',
          'left-2 right-2 w-auto overflow-hidden',
          announcementMessage ?
            'h-max-0 opacity-100' :
            'h-0 opacity-0 border-transparent shadow-none'
        )}
        style={{
          overflow: 'hidden'
        }}
      >
        {announcementMessage && (
          <div className='p-4 text-sm text-foregroundoverflow-auto'>
            {announcementMessage}
          </div>
        )}
      </aside>
    );
  }
);

export { AnnouncementTopbar };
