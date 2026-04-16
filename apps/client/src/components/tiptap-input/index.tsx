import { useCustomEmojis } from '@/features/server/emojis/hooks';
import { useFilteredUsers } from '@/features/server/users/hooks';
import { TestId, type TCommandInfo } from '@sharkord/shared';
import Emoji, { gitHubEmojis } from '@tiptap/extension-emoji';
import Link from '@tiptap/extension-link';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import {
  memo,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type Ref
} from 'react';
import {
  COMMANDS_STORAGE_KEY,
  CommandSuggestion
} from './extensions/commands/command-suggestion';
import { PluginCommandNode } from './extensions/commands/plugin-command-node';
import { SlashCommands } from './extensions/commands/slash-commands-extension';
import { EmojiSuggestion } from './extensions/emojis/suggestions';
import { Mention } from './extensions/mentions';
import { MentionNode } from './extensions/mentions/node';
import {
  MENTION_STORAGE_KEY,
  MentionSuggestion
} from './extensions/mentions/suggestion';
import type { TEmojiItem } from './helpers';

type TTiptapInputHandle = {
  insertEmoji: (emoji: TEmojiItem) => void;
  focus: () => void;
};

type TTiptapInputProps = {
  disabled?: boolean;
  readOnly?: boolean;
  value?: string;
  onChange?: (html: string) => void;
  onSubmit?: () => void;
  onCancel?: () => void;
  onTyping?: () => void;
  commands?: TCommandInfo[];
  ref?: Ref<TTiptapInputHandle>;
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
    commands,
    ref
  }: TTiptapInputProps) => {
    const readOnlyRef = useRef(readOnly);

    readOnlyRef.current = readOnly;

    const customEmojis = useCustomEmojis();
    const users = useFilteredUsers();

    const extensions = useMemo(() => {
      const exts = [
        StarterKit.configure({
          hardBreak: {
            HTMLAttributes: {
              class: 'hard-break'
            }
          }
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
        PluginCommandNode
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
        attributes: {
          'data-testid': TestId.MESSAGE_COMPOSE_EDITOR
        },
        handleKeyDown: (_view, event) => {
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
              return false;
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
        handlePaste: () => !!readOnlyRef.current,
        handleDrop: () => readOnlyRef.current
      }
    });

    const handleEmojiSelect = (emoji: TEmojiItem) => {
      if (disabled || readOnly) return;

      if (emoji.shortcodes.length > 0) {
        editor?.chain().focus().setEmoji(emoji.shortcodes[0]).run();
      }
    };

    useImperativeHandle(ref, () => ({
      insertEmoji: handleEmojiSelect,
      focus: () => editor?.commands.focus()
    }));

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

    const isEmpty = !editor || editor.isEmpty;

    return (
      <div className="relative flex min-w-0 flex-1">
        <EditorContent
          editor={editor}
          className={`w-full tiptap relative transition-colors [&_.ProseMirror]:px-5 [&_.ProseMirror]:py-[14px] [&_.ProseMirror:focus]:outline-none ${
            disabled ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        />
        {isEmpty && (
          <div className="absolute top-0 left-0 px-5 py-[14px] text-muted-foreground/50 pointer-events-none select-none">
            Type a message...
          </div>
        )}
      </div>
    );
  }
);

export { TiptapInput, type TTiptapInputHandle };
