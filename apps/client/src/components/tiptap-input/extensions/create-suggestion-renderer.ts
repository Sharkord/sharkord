import { computePosition } from '@floating-ui/dom';
import type { Editor } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import type { ComponentType, Ref } from 'react';
import type { TSuggestionListRef } from './suggestion-list';

type TSuggestionRenderProps<TItem> = {
  editor: Editor;
  query: string;
  clientRect?: (() => DOMRect | null) | null;
  command: (item: TItem) => void;
};

type TSuggestionListComponentProps<TItem> = {
  items: TItem[];
  onSelect: (item: TItem) => void;
  ref?: Ref<TSuggestionListRef>;
};

const createSuggestionRenderer = <TItem>(
  List: ComponentType<TSuggestionListComponentProps<TItem>>,
  getItems: (props: { editor: Editor; query: string }) => TItem[]
) => {
  return () => {
    let component: ReactRenderer | null = null;

    const cleanup = () => {
      if (component?.element && document.body.contains(component.element)) {
        document.body.removeChild(component.element);
      }

      component?.destroy();
      component = null;
    };

    const reposition = (props: TSuggestionRenderProps<TItem>) => {
      const clientRect = props.clientRect?.();

      if (!clientRect || !component?.element) return;

      const virtualElement = { getBoundingClientRect: () => clientRect };

      computePosition(virtualElement, component.element, {
        placement: 'top-start'
      }).then((position) => {
        if (!component?.element) return;

        Object.assign(component.element.style, {
          left: `${position.x}px`,
          top: `${position.y}px`,
          position: position.strategy === 'fixed' ? 'fixed' : 'absolute'
        });
      });
    };

    const buildProps = (props: TSuggestionRenderProps<TItem>) => ({
      items: getItems({ editor: props.editor, query: props.query }),
      onSelect: (item: TItem) => {
        props.command(item);

        cleanup();
      }
    });

    return {
      onStart(props: TSuggestionRenderProps<TItem>) {
        component = new ReactRenderer(List, {
          props: buildProps(props),
          editor: props.editor,
          // this wrapper is the element reposition() positions, so the stacking
          // context has to live here, a z-index on the static list inside it does
          // nothing. `dark` because the popup is mounted on document.body, outside
          // the server view div that hardcodes the dark theme variables
          className: 'dark relative z-50'
        });

        document.body.appendChild(component.element);

        reposition(props);
      },
      onUpdate(props: TSuggestionRenderProps<TItem>) {
        component?.updateProps(buildProps(props));

        reposition(props);
      },
      onKeyDown(props: { event: KeyboardEvent }) {
        const listRef = component?.ref as TSuggestionListRef | undefined;

        return listRef?.onKeyDown(props.event) ?? false;
      },
      onExit: cleanup
    };
  };
};

export { createSuggestionRenderer };
