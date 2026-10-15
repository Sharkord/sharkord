import { MessageNodeType, type TCommandArg } from '@sharkord/shared';
import { Node } from '@tiptap/core';
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps
} from '@tiptap/react';
import type { ChangeEvent, KeyboardEvent as ReactKeyboardEvent } from 'react';
import { memo, useCallback, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  safeJsonParse,
  serializePluginCommandText,
  type TPluginCommandValues
} from './helpers';

type TPluginCommandAttrs = {
  pluginId: string;
  commandName: string;
  args: string;
  values: string;
};

type TPluginCommandOptions = {
  onSubmit?: () => void;
};

type TCommandArgInputProps = {
  arg: TCommandArg;
  value: string;
  onValueChange: (name: string, value: string) => void;
  handleKeyNavigation: (
    event: ReactKeyboardEvent<HTMLInputElement | HTMLSelectElement>
  ) => boolean;
};

const CommandArgInput = memo(
  ({
    arg,
    value,
    onValueChange,
    handleKeyNavigation
  }: TCommandArgInputProps) => {
    const { t } = useTranslation('common');

    const handleChange = useCallback(
      (event: ChangeEvent<HTMLSelectElement | HTMLInputElement>) =>
        onValueChange(arg.name, event.target.value),
      [onValueChange, arg.name]
    );

    const handleKeyDown = useCallback(
      (event: ReactKeyboardEvent<HTMLSelectElement | HTMLInputElement>) => {
        if (handleKeyNavigation(event)) return;

        if (
          event.key === 'Escape' &&
          event.currentTarget instanceof HTMLInputElement
        ) {
          event.currentTarget.blur();
        }

        event.stopPropagation();
      },
      [handleKeyNavigation]
    );

    const requirement = arg.required
      ? t('commandArgRequired')
      : t('commandArgOptional');
    const placeholder = arg.description ?? requirement;

    if (arg.type === 'boolean') {
      return (
        <label
          className="inline-flex items-center gap-1 rounded bg-background px-1.5 py-0.5"
          title={arg.description}
        >
          <span className="text-[10px] text-muted-foreground">{arg.name}</span>
          <select
            className="h-5 rounded border bg-background px-1 text-[11px]"
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          >
            <option value="">{requirement}</option>
            <option value="true">{t('commandArgYes')}</option>
            <option value="false">{t('commandArgNo')}</option>
          </select>
        </label>
      );
    }

    return (
      <label
        className="inline-flex items-center gap-1 rounded bg-background px-1.5 py-0.5"
        title={arg.description}
      >
        <span className="text-[10px] text-muted-foreground">{arg.name}</span>
        <input
          type={arg.type === 'number' ? 'number' : 'text'}
          value={value}
          placeholder={placeholder}
          className="h-5 min-w-18 rounded border bg-background px-1 text-[11px]"
          onChange={handleChange}
          onKeyDown={handleKeyDown}
        />
      </label>
    );
  }
);

const PluginCommandNodeView = memo(
  ({ node, updateAttributes, editor, getPos, extension }: NodeViewProps) => {
    const attrs = node.attrs as TPluginCommandAttrs;
    const wrapperRef = useRef<HTMLSpanElement | null>(null);

    const argDefs = useMemo(
      () => safeJsonParse<TCommandArg[]>(attrs.args, []),
      [attrs.args]
    );

    const values = useMemo(
      () => safeJsonParse<TPluginCommandValues>(attrs.values, {}),
      [attrs.values]
    );

    const setValue = (argName: string, value: string) => {
      const nextValues: TPluginCommandValues = {
        ...values,
        [argName]: value
      };

      updateAttributes({
        values: JSON.stringify(nextValues)
      });
    };

    const focusEditorAfterNode = () => {
      const pos = typeof getPos === 'function' ? getPos() : null;

      if (typeof pos === 'number') {
        editor
          .chain()
          .setTextSelection(pos + node.nodeSize)
          .focus()
          .run();
        return;
      }

      editor.chain().focus().run();
    };

    const handleKeyNavigation = (
      event: ReactKeyboardEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
      const isEnter =
        event.key === 'Enter' &&
        !event.shiftKey &&
        !event.nativeEvent.isComposing;

      if (event.key !== 'Tab' && !isEnter) {
        return false;
      }

      const wrapper = wrapperRef.current;

      if (!wrapper) {
        return false;
      }

      const controls = Array.from(
        wrapper.querySelectorAll<HTMLInputElement | HTMLSelectElement>(
          'input, select'
        )
      );

      const currentIndex = controls.indexOf(event.currentTarget);

      if (currentIndex === -1) {
        return false;
      }

      event.preventDefault();

      const isLast = currentIndex === controls.length - 1;

      if (isEnter) {
        if (!isLast) {
          controls[currentIndex + 1]?.focus();

          return true;
        }

        const { onSubmit } = extension.options as TPluginCommandOptions;

        if (onSubmit) {
          onSubmit();
        } else {
          focusEditorAfterNode();
        }

        return true;
      }

      if (event.shiftKey) {
        if (currentIndex > 0) {
          controls[currentIndex - 1]?.focus();
        } else {
          focusEditorAfterNode();
        }

        return true;
      }

      if (isLast) {
        focusEditorAfterNode();
      } else {
        controls[currentIndex + 1]?.focus();
      }

      return true;
    };

    useEffect(() => {
      const rafId = requestAnimationFrame(() => {
        const wrapper = wrapperRef.current;

        if (!wrapper) {
          return;
        }

        const firstControl = wrapper.querySelector<
          HTMLInputElement | HTMLSelectElement
        >('input, select');

        if (!firstControl) {
          return;
        }

        firstControl.focus();

        if (firstControl instanceof HTMLInputElement) {
          firstControl.select();
        }
      });

      return () => {
        cancelAnimationFrame(rafId);
      };
    }, []);

    return (
      <NodeViewWrapper
        as="span"
        ref={wrapperRef}
        className="inline-flex flex-wrap items-center gap-1 rounded-md border bg-muted/40 px-2 py-1 align-middle"
        contentEditable={false}
      >
        <span className="text-xs text-muted-foreground shrink-0">/</span>
        <span className="text-xs font-medium shrink-0">
          {attrs.commandName}
        </span>

        {argDefs.map((arg) => (
          <CommandArgInput
            key={arg.name}
            arg={arg}
            value={values[arg.name] ?? ''}
            onValueChange={setValue}
            handleKeyNavigation={handleKeyNavigation}
          />
        ))}
      </NodeViewWrapper>
    );
  }
);

export const PluginCommandNode = Node.create({
  name: 'pluginCommand',
  group: 'inline',
  inline: true,
  atom: true,

  addOptions(): TPluginCommandOptions {
    return { onSubmit: undefined };
  },

  addNodeView() {
    return ReactNodeViewRenderer(PluginCommandNodeView, { as: 'span' });
  },

  addAttributes() {
    return {
      pluginId: {
        default: '',
        parseHTML: (el: Element) => el.getAttribute('data-plugin-id') || '',
        renderHTML: (attrs: TPluginCommandAttrs) => ({
          'data-plugin-id': attrs.pluginId
        })
      },
      commandName: {
        default: '',
        parseHTML: (el: Element) => el.getAttribute('data-command-name') || '',
        renderHTML: (attrs: TPluginCommandAttrs) => ({
          'data-command-name': attrs.commandName
        })
      },
      args: {
        default: '[]',
        parseHTML: (el: Element) =>
          el.getAttribute('data-command-args') || '[]',
        renderHTML: (attrs: TPluginCommandAttrs) => ({
          'data-command-args': attrs.args
        })
      },
      values: {
        default: '{}',
        parseHTML: (el: Element) =>
          el.getAttribute('data-command-values') || '{}',
        renderHTML: (attrs: TPluginCommandAttrs) => ({
          'data-command-values': attrs.values
        })
      }
    };
  },

  parseHTML() {
    return [
      {
        tag: `span[data-type="${MessageNodeType.PLUGIN_COMMAND}"]`
      }
    ];
  },

  renderHTML({ node }) {
    const attrs = node.attrs as TPluginCommandAttrs;
    const argDefs = safeJsonParse<TCommandArg[]>(attrs.args, []);
    const values = safeJsonParse<TPluginCommandValues>(attrs.values, {});

    return [
      'span',
      {
        'data-type': MessageNodeType.PLUGIN_COMMAND,
        'data-plugin-id': attrs.pluginId,
        'data-command-name': attrs.commandName,
        'data-command-args': attrs.args,
        'data-command-values': attrs.values,
        class: 'plugin-command'
      },
      serializePluginCommandText(attrs.commandName, argDefs, values)
    ];
  }
});
