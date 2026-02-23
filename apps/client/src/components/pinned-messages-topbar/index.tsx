import { cn } from '@/lib/utils';
import type { TJoinedMessage } from '@sharkord/shared/src/tables';
import { memo } from 'react';
import { MessagesGroup } from '../channel-view/text/messages-group';

type TPinnedMessagesTopbarProps = {
  className?: string;
  isOpen?: boolean;
  messageRefs: React.RefObject<Record<number, HTMLDivElement | null>>;
  messages: TJoinedMessage[];
};

const PinnedMessagesTopbar = memo(
  ({
    className,
    isOpen = true,
    messageRefs,
    messages
  }: TPinnedMessagesTopbarProps) => {
    const pinnedMessages = messages.filter((msg) => msg.pinned);

    return (
      <aside
        className={cn(
          'flex flex-col border-l border-border bg-card h-full transition-all duration-500 ease-in-out',
          'bg-neutral-800 rounded-xl shadow-md border border-neutral-700 mx-2 mt-2',
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
            <div className="overflow-auto">
              {pinnedMessages.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No pinned messages
                </div>
              ) : (
                pinnedMessages.map((message) => (
                  <div key={message.id} className="border-b border-border">
                    <MessagesGroup
                      group={[message]}
                      messageRefs={messageRefs}
                      type="pinned"
                    />
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </aside>
    );
  }
);

export { PinnedMessagesTopbar };
