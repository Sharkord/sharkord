import { cn } from '@/lib/utils';
import type { TJoinedMessage } from '@sharkord/shared/src/tables';
import { memo, useContext, useEffect } from 'react';
import { MessagesGroup } from '../channel-view/text/messages-group';
import { PinnedMessageContext } from '../pinned-message-provider/pinned-message-context';

type TPinnedMessagesBoxProps = {
  className?: string;
  isOpen?: boolean;
  messageRefs: React.RefObject<Record<number, HTMLDivElement | null>>;
  messages: TJoinedMessage[];
};

const PinnedMessagesBox = memo(
  ({ isOpen = true, messageRefs, messages }: TPinnedMessagesBoxProps) => {
    const pinnedMessages = messages.filter((msg) => msg.pinned);
    const pinnedMessageContext = useContext(PinnedMessageContext);

    useEffect(() => {
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          pinnedMessageContext.setVisible(false);
        }
      };

      document.addEventListener('keydown', onKeyDown);
      return () => {
        document.removeEventListener('keydown', onKeyDown);
      };
    }, [pinnedMessageContext]);

    return (
      <aside
        className={cn(
          'absolute left-2 right-2 w-auto transition-[height,padding,opacity] duration-500 ease-in-out overflow-hidden',
          'bg-card rounded-xl shadow-md border mx-2 mt-2',
          'max-w-4xl mx-auto',
          pinnedMessageContext.visible
            ? 'max-h-[85vh] h-auto p-2 opacity-100 z-10'
            : 'h-0 p-0 opacity-0 border-transparent shadow-none'
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

export { PinnedMessagesBox };
