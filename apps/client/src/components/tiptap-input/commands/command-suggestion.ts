import type { TBuiltInCommand } from '@/helpers/built-in-commands';
import { computePosition } from '@floating-ui/dom';
import type { Editor } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import { CommandList, type CommandListRef } from './command-list';

interface SuggestionProps {
  editor: Editor;
  query: string;
  items: TBuiltInCommand[];
  clientRect?: (() => DOMRect | null) | null;
  command: (item: TBuiltInCommand) => void;
}

export const CommandSuggestion = {
  char: '/',
  startOfLine: true,
  command: ({
    editor,
    range,
    props
  }: {
    editor: Editor;
    range: { from: number; to: number };
    props: TBuiltInCommand;
  }) => {
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertContent(`/${props.name}`)
      .run();
  },
  render: () => {
    let component: ReactRenderer | null = null;

    const reposition = (clientRect: DOMRect) => {
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
    };

    return {
      onStart: (props: SuggestionProps) => {
        component = new ReactRenderer(CommandList, {
          props: {
            items: props.items,
            onSelect: (item: TBuiltInCommand) => {
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          editor: props.editor as any
        });

        document.body.appendChild(component.element);

        const rect = props.clientRect?.();

        if (rect) {
          reposition(rect);
        }
      },

      onUpdate(props: SuggestionProps) {
        component?.updateProps({
          items: props.items,
          onSelect: (item: TBuiltInCommand) => {
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
        const commandListRef = component?.ref as CommandListRef | undefined;

        if (commandListRef?.onKeyDown) {
          return commandListRef.onKeyDown(props.event);
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
