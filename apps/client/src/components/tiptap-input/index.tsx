import { EmojiPicker } from '@/components/emoji-picker';
import { useCustomEmojis } from '@/features/server/emojis/hooks';
import { useFilteredUsers } from '@/features/server/users/hooks';
import { htmlToTiptapHtml } from '@/helpers/html-to-tiptap-html';
import type { TCommandInfo } from '@sharkord/shared';
import { Button } from '@sharkord/ui';
import Emoji, { gitHubEmojis } from '@tiptap/extension-emoji';
import Link from '@tiptap/extension-link';
import { DOMParser as PMMDOMParser } from '@tiptap/pm/model';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Smile } from 'lucide-react';
import { memo, useEffect, useMemo, useRef } from 'react';
import type { TEmojiItem } from './helpers';
import {
  COMMANDS_STORAGE_KEY,
  CommandSuggestion
} from './plugins/command-suggestion';
import { MarkdownSyntaxDim } from './plugins/markdown-syntax-dim';
import { Mention } from './plugins/mentions';
import { MentionNode } from './plugins/mentions/node';
import {
  MENTION_STORAGE_KEY,
  MentionSuggestion
} from './plugins/mentions/suggestion';
import { SlashCommands } from './plugins/slash-commands-extension';
import { EmojiSuggestion } from './plugins/suggestions';

type TTiptapInputProps = {
  disabled?: boolean;
  readOnly?: boolean;
  value?: string;
  onChange?: (html: string) => void;
  onSubmit?: () => void;
  onCancel?: () => void;
  onTyping?: () => void;
  commands?: TCommandInfo[];
};

const TiptapInput = memo(
  ({
    value,
    onChange,
    onSubmit,
    onCancel,
    onTyping,
    disabled,
    readOnly,
    commands
  }: TTiptapInputProps) => {
    const readOnlyRef = useRef(readOnly);

    readOnlyRef.current = readOnly;

    const editorWrapperRef = useRef<HTMLDivElement>(null);

    const customEmojis = useCustomEmojis();
    const users = useFilteredUsers();

    const extensions = useMemo(() => {
      const exts = [
        StarterKit.configure({
          // disable all WYSIWYG formatting -- we want to see every character
          // typed as-is (markdown-aware plain text, not rich text)
          bold: false,
          italic: false,
          strike: false,
          code: false,
          codeBlock: false,
          blockquote: false,
          heading: false,
          bulletList: false,
          orderedList: false,
          listItem: false,
          listKeymap: false,
          horizontalRule: false,
          hardBreak: false
        }),
        Link.configure({
          autolink: true,
          defaultProtocol: 'https',
          openOnClick: false,
          HTMLAttributes: {
            target: '_blank',
            rel: 'noopener noreferrer'
          },
          shouldAutoLink: (url) => {
            return /^https?:\/\//i.test(url);
          }
        }),
        Emoji.configure({
          emojis: [...gitHubEmojis, ...customEmojis],
          enableEmoticons: true,
          suggestion: EmojiSuggestion,
          HTMLAttributes: {
            class: 'emoji-image'
          }
        }),
        Mention.configure({
          users,
          suggestion: MentionSuggestion
        }),
        MentionNode,
        MarkdownSyntaxDim
      ];

      if (commands) {
        exts.push(
          SlashCommands.configure({
            commands,
            suggestion: CommandSuggestion
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          }) as any
        );
      }

      return exts;
    }, [customEmojis, commands, users]);

    const editor = useEditor({
      extensions,
      content: value,
      editable: !disabled,
      onUpdate: ({ editor }) => {
        const html = editor.getHTML();

        onChange?.(html);

        if (!editor.isEmpty) {
          onTyping?.();
        }
      },
      editorProps: {
        handleKeyDown: (view, event) => {
          // block all input when readOnly
          if (readOnlyRef.current) {
            event.preventDefault();
            return true;
          }

          const suggestionElement = document.querySelector('.bg-popover');
          const hasSuggestions =
            suggestionElement && document.body.contains(suggestionElement);

          if (event.key === 'Enter') {
            if (event.shiftKey) {
              // insert a new paragraph instead of a hard-break -- shift+enter
              // means "new line without submitting", not "inline line break"
              event.preventDefault();
              view.dispatch(
                view.state.tr
                  .split(view.state.selection.anchor)
                  .scrollIntoView()
              );
              return true;
            }

            // if suggestions are active, don't handle Enter - let the suggestion handle it
            if (hasSuggestions) {
              return false;
            }

            event.preventDefault();
            onSubmit?.();
            return true;
          }

          if (event.key === 'Escape') {
            event.preventDefault();
            onCancel?.();
            return true;
          }

          return false;
        },
        handleClickOn: (_view, _pos, _node, _nodePos, event) => {
          const target = event.target as HTMLElement;

          // prevents clicking on links inside the edit from opening them in the browser
          if (target.tagName === 'A') {
            event.preventDefault();

            return true;
          }

          return false;
        },
        handlePaste: (view, event) => {
          if (readOnlyRef.current) return true;

          const html = event.clipboardData?.getData('text/html');
          const text = event.clipboardData?.getData('text/plain');

          // convert html clipboard content to markdown paragraph html, then
          // let prosemirror parse and insert it as structured nodes
          const escapeText = (s: string) =>
            s
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;');

          const pasteHtml = html
            ? htmlToTiptapHtml(html)
            : text
              ? text
                  .split(/\r?\n/)
                  .map((l) => {
                    const indent = l.match(/^[ \t]*/)?.[0] ?? '';
                    const encodedIndent = [...indent]
                      .map((c) =>
                        c === '\t' ? '&nbsp;&nbsp;&nbsp;&nbsp;' : '&nbsp;'
                      )
                      .join('');
                    return `<p>${encodedIndent}${escapeText(l.slice(indent.length))}</p>`;
                  })
                  .join('')
              : null;

          if (!pasteHtml) return false;

          event.preventDefault();

          const { state, dispatch } = view;
          const dom = document.createElement('div');
          dom.innerHTML = pasteHtml;
          const slice = PMMDOMParser.fromSchema(state.schema).parseSlice(dom);
          dispatch(state.tr.replaceSelection(slice).scrollIntoView());
          return true;
        },
        handleDrop: () => readOnlyRef.current
      }
    });

    const handleEmojiSelect = (emoji: TEmojiItem) => {
      if (disabled || readOnly) return;

      if (emoji.shortcodes.length > 0) {
        editor?.chain().focus().setEmoji(emoji.shortcodes[0]).run();
      }
    };

    // keep emoji storage in sync with custom emojis from the store
    // this ensures newly added emojis appear in autocomplete without refreshing the app
    useEffect(() => {
      if (editor) {
        const allEmojis = [...gitHubEmojis, ...customEmojis];

        if (editor.storage.emoji) {
          editor.storage.emoji.emojis = allEmojis;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const applyEmojiOptions = (extension: any) => {
          const typed = extension;

          if (typed.name === 'emoji' && typed.options) {
            typed.options.emojis = allEmojis;
          }
        };

        editor.extensionManager.extensions.forEach(applyEmojiOptions);
        editor.options.extensions?.forEach(applyEmojiOptions);
      }
    }, [editor, customEmojis]);

    // keep commands storage in sync with plugin commands from the store
    useEffect(() => {
      if (editor && commands) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const storage = editor.storage as any;
        if (storage[COMMANDS_STORAGE_KEY]) {
          storage[COMMANDS_STORAGE_KEY].commands = commands;
        }
      }
    }, [editor, commands]);

    // keep mention users storage in sync with the users from the store
    useEffect(() => {
      if (editor) {
        const storage = editor.storage as unknown as Record<
          string,
          { users?: typeof users }
        >;

        if (storage[MENTION_STORAGE_KEY]) {
          storage[MENTION_STORAGE_KEY].users = users;
        }
      }
    }, [editor, users]);

    useEffect(() => {
      if (editor && value !== undefined) {
        const currentContent = editor.getHTML();

        // only update if content is actually different to avoid cursor jumping
        if (currentContent !== value) {
          editor.commands.setContent(value);
        }
      }
    }, [editor, value]);

    useEffect(() => {
      if (editor) {
        editor.setEditable(!disabled);
      }
    }, [editor, disabled]);

    return (
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <div ref={editorWrapperRef} className="relative flex min-w-0 flex-1">
          <EditorContent
            editor={editor}
            className={`border p-2 rounded w-full min-h-10 max-h-80 tiptap overflow-auto relative transition-colors focus-within:border-ring [&_.ProseMirror:focus]:outline-none ${
              disabled ? ' opacity-50 cursor-not-allowed bg-muted' : ''
            }`}
          />
        </div>

        <EmojiPicker onEmojiSelect={handleEmojiSelect}>
          <Button variant="ghost" size="icon" disabled={disabled}>
            <Smile className="h-5 w-5" />
          </Button>
        </EmojiPicker>
      </div>
    );
  }
);

export { TiptapInput };
