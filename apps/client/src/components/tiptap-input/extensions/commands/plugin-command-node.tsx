import type { TCommandArg } from '@sharkord/shared';
import { Node } from '@tiptap/core';
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps
} from '@tiptap/react';
import {
  memo,
  useEffect,
  useMemo,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent
} from 'react';

type TPluginCommandValues = Record<string, string>;

type TPluginCommandAttrs = {
  pluginId: string;
  commandName: string;
  args: string;
  values: string;
};

const safeJsonParse = <T,>(raw: unknown, fallback: T): T => {
  if (typeof raw !== 'string' || !raw) {
    return fallback;
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
};

const serializeArgToken = (value: string): string => {
  if (value.length === 0) {
    return '""';
  }

  if (/^[^\s"'\\]+$/.test(value)) {
    return value;
  }

  const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');

  return `"${escaped}"`;
};

const serializePluginCommandText = (
  commandName: string,
  argDefs: TCommandArg[],
  values: TPluginCommandValues
): string => {
  const tokens: string[] = [`/${commandName}`];

  for (const arg of argDefs) {
    const raw = values[arg.name];

    if (raw === undefined || raw === '') {
      continue;
    }

    if (arg.type === 'number') {
      tokens.push(raw);
      continue;
    }

    if (arg.type === 'boolean') {
      tokens.push(raw === 'true' ? 'true' : 'false');
      continue;
    }

    tokens.push(serializeArgToken(raw));
  }

  return tokens.join(' ');
};

const PluginCommandNodeView = memo(
  ({ node, updateAttributes, editor, getPos }: NodeViewProps) => {
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

    const handleTabNavigation = (
      event: ReactKeyboardEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
      if (event.key !== 'Tab') {
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

      if (event.shiftKey) {
        if (currentIndex > 0) {
          controls[currentIndex - 1]?.focus();
        } else {
          focusEditorAfterNode();
        }

        return true;
      }

      if (currentIndex < controls.length - 1) {
        controls[currentIndex + 1]?.focus();
      } else {
        focusEditorAfterNode();
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

        {argDefs.map((arg) => {
          const value = values[arg.name] ?? '';

          if (arg.type === 'boolean') {
            return (
              <label
                key={arg.name}
                className="inline-flex items-center gap-1 rounded bg-background px-1.5 py-0.5"
              >
                <span className="text-[10px] text-muted-foreground">
                  {arg.name}
                </span>
                <select
                  className="h-5 rounded border bg-background px-1 text-[11px]"
                  value={value}
                  onChange={(e) => setValue(arg.name, e.target.value)}
                  onKeyDown={(e) => {
                    if (handleTabNavigation(e)) {
                      return;
                    }

                    e.stopPropagation();
                  }}
                >
                  <option value="">-</option>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              </label>
            );
          }

          return (
            <label
              key={arg.name}
              className="inline-flex items-center gap-1 rounded bg-background px-1.5 py-0.5"
            >
              <span className="text-[10px] text-muted-foreground">
                {arg.name}
              </span>
              <input
                type={arg.type === 'number' ? 'number' : 'text'}
                value={value}
                placeholder={arg.required ? 'required' : 'optional'}
                className="h-5 min-w-18 rounded border bg-background px-1 text-[11px]"
                onChange={(e) => setValue(arg.name, e.target.value)}
                onKeyDown={(e) => {
                  if (handleTabNavigation(e)) {
                    return;
                  }

                  if (e.key === 'Escape') {
                    (e.currentTarget as HTMLInputElement).blur();
                  }

                  e.stopPropagation();
                }}
              />
            </label>
          );
        })}
      </NodeViewWrapper>
    );
  }
);

export const PluginCommandNode = Node.create({
  name: 'pluginCommand',
  group: 'inline',
  inline: true,
  atom: true,

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
        tag: 'span[data-type="plugin-command"]'
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
        'data-type': 'plugin-command',
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
