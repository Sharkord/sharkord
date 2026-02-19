import { computePosition } from '@floating-ui/dom';
import type { Editor } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import { EmojiList, type EmojiListRef } from './emoji-list';
import type { TEmojiItem } from './types';

interface EmojiStorage {
  emojis: TEmojiItem[];
}

interface EditorWithEmojiStorage extends Editor {
  storage: Editor['storage'] & {
    emoji: EmojiStorage;
  };
}

interface SuggestionProps {
  editor: Editor;
  query: string;
  clientRect?: (() => DOMRect | null) | null;
  command: (item: TEmojiItem) => void;
}

export const EmojiSuggestion = {
  items: ({ editor, query }: { editor: Editor; query: string }) => {
    const editorWithEmoji = editor as EditorWithEmojiStorage;
    const emojis: TEmojiItem[] = editorWithEmoji.storage.emoji?.emojis || [];

    return emojis
      .filter(
        (e) =>
          e.shortcodes.some((shortcode) =>
            shortcode.toLowerCase().startsWith(query.toLowerCase())
          ) || e.name.toLowerCase().startsWith(query.toLowerCase())
      )
      .slice(0, 5);
  },
  allowSpaces: false,
  render: () => {
    let component: ReactRenderer | null = null;

    function reposition(clientRect: DOMRect) {
      if (!component?.element) return;

      const virtualElement = { getBoundingClientRect: () => clientRect };

      computePosition(virtualElement, component.element, {
        placement: 'top-start'
      }).then((pos) => {
        if (component?.element) {
          Object.assign(component.element.style, {
            left: `${pos.x}px`,
            top: `${pos.y}px`,
            position: pos.strategy === 'fixed' ? 'fixed' : 'absolute'
          });
        }
      });
    }

    return {
      onStart: (props: SuggestionProps) => {
        const filteredItems = EmojiSuggestion.items({
          editor: props.editor,
          query: props.query
        });

        component = new ReactRenderer(EmojiList, {
          props: {
            items: filteredItems,
            onSelect: (item: TEmojiItem) => {
              props.command(item);

              if (
                component?.element &&
                document.body.contains(component.element)
              ) {
                document.body.removeChild(component.element);
              }

              component?.destroy();
              component = null;
            }
          },
          editor: props.editor
        });

        document.body.appendChild(component.element);
        const rect = props.clientRect?.();
        if (rect) {
          reposition(rect);
        }
      },

      onUpdate(props: SuggestionProps) {
        const filteredItems = EmojiSuggestion.items({
          editor: props.editor,
          query: props.query
        });

        component?.updateProps({
          items: filteredItems,
          onSelect: (item: TEmojiItem) => {
            props.command(item);

            if (
              component?.element &&
              document.body.contains(component.element)
            ) {
              document.body.removeChild(component.element);
            }

            component?.destroy();
            component = null;
          }
        });
        const rect = props.clientRect?.();
        if (rect) {
          reposition(rect);
        }
      },

      onKeyDown(props: { event: KeyboardEvent }) {
        const emojiListRef = component?.ref as EmojiListRef | undefined;
        if (emojiListRef?.onKeyDown) {
          return emojiListRef.onKeyDown(props.event);
        }
        return false;
      },

      onExit() {
        if (component?.element && document.body.contains(component.element)) {
          document.body.removeChild(component.element);
        }

        component?.destroy();
        component = null;
      }
    };
  }
};
