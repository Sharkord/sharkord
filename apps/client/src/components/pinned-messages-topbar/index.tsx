import { cn } from '@/lib/utils';
import { memo, useRef } from 'react';
import { MessagesGroup } from '../channel-view/text/messages-group';
import { Button } from '../ui/button';

type TPinnedMessagesTopbarProps = {
  className?: string;
  isOpen?: boolean;
  messageRefs: any;
  messages: any[];
};

const PinnedMessagesTopbar = memo(
  ({ className, isOpen = true, messageRefs, messages }: TPinnedMessagesTopbarProps) => {

    const pinnedMessages = messages.filter((msg) => msg.bool_pinned);
    const pinnedMessageRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

    function scrollToMessage(id: number) {
      const el = messageRefs.current[id];
      if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }

    isOpen = true;
    
    return (
      <aside
        className={cn(
          'flex flex-col border-l border-border bg-card h-full transition-all duration-500 ease-in-out',
          isOpen ? 'w-60' : 'w-0 border-l-0',
          className
        )}
        style={{
          overflow: 'hidden'
        }}
      >
        {isOpen && (
          <>
            <div className="flex h-12 items-center border-b border-border px-4">
              <h3 className="text-sm font-semibold text-foreground">
                Pinned Messages 
              </h3>
            </div>
            <div className='overflow-auto'>
              {pinnedMessages.map((message) => (
                <div key={message.id} className="border-b border-border">
                  <Button key={message.id}
                          onClick={() => scrollToMessage(message.id)}
                  >
                    MOVE
                  </Button>
                  <MessagesGroup group={[message]} messageRefs={pinnedMessageRefs} />
                </div>
              ))}
            </div>
          </>
        )}
      </aside>
    );
  }
);

export { PinnedMessagesTopbar };
