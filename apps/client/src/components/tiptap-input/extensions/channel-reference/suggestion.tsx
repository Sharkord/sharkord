import { computePosition } from '@floating-ui/dom';
import type { TChannel } from '@sharkord/shared';
import type { Editor } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import { Hash } from 'lucide-react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useState
} from 'react';

const CHANNEL_REF_STORAGE_KEY = 'channelRefChannels';

type TChannelListProps = {
  items: TChannel[];
  onSelect: (item: TChannel) => void;
};

export type TChannelListRef = {
  onKeyDown: (event: KeyboardEvent) => boolean;
};

const ChannelList = forwardRef<TChannelListRef, TChannelListProps>(
  ({ items, onSelect }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => setSelectedIndex(0), [items]);

    const selectItem = useCallback(
      (index: number) => items[index] && onSelect(items[index]),
      [items, onSelect]
    );

    const onKeyDown = useCallback(
      (e: KeyboardEvent): boolean => {
        if (items.length === 0) return false;

        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setSelectedIndex((i) => (i <= 0 ? items.length - 1 : i - 1));
          return true;
        }

        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setSelectedIndex((i) => (i >= items.length - 1 ? 0 : i + 1));
          return true;
        }

        if (e.key === 'Enter' || e.key === 'Tab') {
          e.preventDefault();
          selectItem(selectedIndex);
          return true;
        }

        if (e.key === 'Escape') return false;

        return false;
      },
      [items, selectItem, selectedIndex]
    );

    useImperativeHandle(ref, () => ({ onKeyDown }));

    if (items.length === 0) return null;

    return (
      <div
        className="bg-popover text-popover-foreground border rounded-md shadow-md min-w-[16rem] max-w-88 max-h-60 overflow-y-auto p-1 z-50"
        role="listbox"
        aria-label="Reference channel"
      >
        {items.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="option"
            aria-selected={index === selectedIndex}
            className={`w-full text-left px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground flex items-center gap-2 cursor-default select-none outline-none transition-colors ${
              index === selectedIndex ? 'bg-accent text-accent-foreground' : ''
            }`}
            onClick={() => onSelect(item)}
          >
            <Hash className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="font-medium truncate">{item.name}</span>
          </button>
        ))}
      </div>
    );
  }
);

const reposition = (component: ReactRenderer | null, clientRect: DOMRect) => {
  if (!component?.element) return;

  const virtual = { getBoundingClientRect: () => clientRect };

  computePosition(virtual, component.element, { placement: 'top-start' }).then(
    (pos) => {
      if (component?.element)
        Object.assign(component.element.style, {
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          position: pos.strategy === 'fixed' ? 'fixed' : 'absolute'
        });
    }
  );
};

const cleanup = (component: ReactRenderer | null) => {
  if (component?.element && document.body.contains(component.element)) {
    document.body.removeChild(component.element);
  }

  component?.destroy();
};

type TSuggestionProps = {
  editor: Editor;
  query: string;
  clientRect?: (() => DOMRect | null) | null;
  command: (item: TChannel) => void;
};

const ChannelReferenceSuggestion = {
  items: ({ editor, query }: { editor: Editor; query: string }): TChannel[] => {
    const channels: TChannel[] =
      (editor.storage as unknown as Record<string, { channels?: TChannel[] }>)[
        CHANNEL_REF_STORAGE_KEY
      ]?.channels ?? [];

    if (!query) return channels.slice(0, 10);

    const q = query.toLowerCase();

    return channels
      .filter((c) => c.name.toLowerCase().includes(q))
      .sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();

        const aS = aName.startsWith(q);
        const bS = bName.startsWith(q);

        if (aS && !bS) return -1;
        if (!aS && bS) return 1;

        return aS && bS ? aName.length - bName.length : 0;
      })
      .slice(0, 10);
  },
  allowSpaces: false,
  render: () => {
    let component: ReactRenderer | null = null;
    return {
      onStart(props: TSuggestionProps) {
        const items = ChannelReferenceSuggestion.items({
          editor: props.editor,
          query: props.query
        });
        const onSelect = (item: TChannel) => {
          props.command(item);
          cleanup(component);
          component = null;
        };
        component = new ReactRenderer(ChannelList, {
          props: { items, onSelect },
          editor: props.editor
        });

        document.body.appendChild(component.element);

        const rect = props.clientRect?.();
        if (rect) {
          reposition(component, rect);
        }
      },
      onUpdate(props: TSuggestionProps) {
        const items = ChannelReferenceSuggestion.items({
          editor: props.editor,
          query: props.query
        });
        component?.updateProps({
          items,
          onSelect: (item: TChannel) => {
            props.command(item);
            cleanup(component);
            component = null;
          }
        });
        const rect = props.clientRect?.();
        if (rect) {
          reposition(component, rect);
        }
      },
      onKeyDown(props: { event: KeyboardEvent }) {
        const ref = component?.ref as TChannelListRef | undefined;
        return ref?.onKeyDown(props.event) ?? false;
      },
      onExit() {
        cleanup(component);
        component = null;
      }
    };
  }
};

export { CHANNEL_REF_STORAGE_KEY, ChannelReferenceSuggestion };
