import { computePosition } from '@floating-ui/dom';
import type { TCommandInfo } from '@sharkord/shared';
import type { Editor } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import { CommandList, type CommandListRef } from './command-list';

const COMMANDS_STORAGE_KEY = 'slashCommands';

interface SuggestionProps {
  editor: Editor;
  query: string;
  clientRect?: (() => DOMRect | null) | null;
  command: (item: TCommandInfo) => void;
}

export const CommandSuggestion = {
  char: '/',
  startOfLine: true,
  items: ({ editor, query }: { editor: Editor; query: string }) => {
    const commands: TCommandInfo[] =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (editor.storage as any)[COMMANDS_STORAGE_KEY]?.commands || [];

    if (!query) {
      return commands.slice(0, 10);
    }

    const lowerQuery = query.toLowerCase();

    return commands
      .filter(
        (c) =>
          c.name.toLowerCase().includes(lowerQuery) ||
          c.pluginId.toLowerCase().startsWith(lowerQuery) ||
          (c.description && c.description.toLowerCase().includes(lowerQuery))
      )
      .sort((a, b) => {
        const aName = a.name.toLowerCase();
        const bName = b.name.toLowerCase();
        const aStartsWith = aName.startsWith(lowerQuery);
        const bStartsWith = bName.startsWith(lowerQuery);

        // exact prefix match comes first
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;

        // if both start with query, shorter name comes first (more exact match)
        if (aStartsWith && bStartsWith) {
          return aName.length - bName.length;
        }

        // otherwise maintain original order
        return 0;
      })
      .slice(0, 10);
  },
  allowSpaces: true,
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
        const filteredItems = CommandSuggestion.items({
          editor: props.editor,
          query: props.query
        });

        component = new ReactRenderer(CommandList, {
          props: {
            items: filteredItems,
            onSelect: (item: TCommandInfo) => {
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
        const filteredItems = CommandSuggestion.items({
          editor: props.editor,
          query: props.query
        });

        component?.updateProps({
          items: filteredItems,
          onSelect: (item: TCommandInfo) => {
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

export { COMMANDS_STORAGE_KEY };
