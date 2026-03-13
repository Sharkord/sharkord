import { EmojiPicker } from '@/components/emoji-picker';
import { useCustomEmojis } from '@/features/server/emojis/hooks';
import { useFilteredUsers } from '@/features/server/users/hooks';
import { htmlToEditorHtml } from '@/helpers/html-to-editor-html';
import type { TCommandInfo } from '@sharkord/shared';
import { Button } from '@sharkord/ui';
import Emoji, { gitHubEmojis } from '@tiptap/extension-emoji';
import { Placeholder } from '@tiptap/extensions';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { ChevronDown, ChevronUp, Smile } from 'lucide-react';
import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from 'react';
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
  placeholder?: string;
  onChange?: (markdown: string) => void;
  onSubmit?: () => void;
  onCancel?: () => void;
  onTyping?: () => void;
  commands?: TCommandInfo[];
};

const TiptapInput = memo(
  ({
    value,
    placeholder,
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

    const [isExpanded, setIsExpanded] = useState(false);
    const [hasOverflow, setHasOverflow] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const editorWrapperRef = useRef<HTMLDivElement>(null);

    const customEmojis = useCustomEmojis();
    const users = useFilteredUsers();

    const extensions = useMemo(() => {
      const exts = [
        StarterKit.configure({
          // disable all wysiwyg formatting nodes -- the editor stays as
          // plain-text markdown; @tiptap/markdown handles serialisation only
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
          hardBreak: false,
          link: {
            autolink: true,
            defaultProtocol: 'https',
            openOnClick: false,
            HTMLAttributes: {
              target: '_blank',
              rel: 'noopener noreferrer'
            },
            shouldAutoLink: (url) => /^https?:\/\//i.test(url)
          }
        }),
        // emoji renders as <span data-type="emoji" data-name="..."> in html
        Emoji.configure({
          emojis: [...gitHubEmojis, ...customEmojis],
          enableEmoticons: true,
          suggestion: EmojiSuggestion,
          HTMLAttributes: {
            class: 'emoji-image'
          }
        }),
        // mention is handled by MentionNode with renderMarkdown
        Mention.configure({
          users,
          suggestion: MentionSuggestion
        }),
        MentionNode,
        MarkdownSyntaxDim,
        Placeholder.configure({ placeholder })
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
    }, [customEmojis, commands, users, placeholder]);

    const editor = useEditor({
      extensions,
      content: value ?? '',
      editable: !disabled,
      onUpdate: ({ editor }) => {
        onChange?.(editor.getHTML());

        if (!editor.isEmpty) {
          onTyping?.();
        }
      },
      editorProps: {
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
              // treat shift+enter as a plain enter (new paragraph) -- the shift
              // just means "don't submit", not "insert a hard break"
              editor.commands.splitBlock();
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

          // prevents clicking on links inside the editor from opening them
          if (target.tagName === 'A') {
            event.preventDefault();
            return true;
          }

          return false;
        },
        handlePaste: (_view, event) => {
          if (readOnlyRef.current) return true;

          const html = event.clipboardData?.getData('text/html');
          const plain = event.clipboardData?.getData('text/plain');

          event.preventDefault();

          if (html) {
            // convert rich html to editor html (markdown syntax as literal text)
            editor?.commands.insertContent(htmlToEditorHtml(html));
          } else if (plain) {
            // insert plain text as-is so < > aren't interpreted as html
            editor?.commands.insertContent({ type: 'text', text: plain });
          }

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
          if (!value) {
            editor.commands.clearContent();
          } else {
            editor.commands.setContent(value);
          }
        }
      }
    }, [editor, value]);

    useEffect(() => {
      if (editor) {
        editor.setEditable(!disabled);
      }
    }, [editor, disabled]);

    // measure if content overflows (more than ~3 lines) when collapsed
    useLayoutEffect(() => {
      if (isExpanded) return;
      const wrapper = editorWrapperRef.current;
      const el = wrapper?.firstElementChild as HTMLElement | null;
      if (el) {
        setHasOverflow(el.scrollHeight > el.clientHeight);
      }
    }, [value, isExpanded]);

    const showExpandButton = hasOverflow || isExpanded;

    return (
      <div className="flex flex-1 items-center gap-2 min-w-0">
        <div
          ref={editorWrapperRef}
          className="relative flex min-w-0 flex-1"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        >
          <EditorContent
            editor={editor}
            className={`border p-2 rounded w-full min-h-10 tiptap overflow-auto relative transition-colors focus-within:border-ring [&_.ProseMirror:focus]:outline-none ${
              isExpanded ? 'max-h-80' : 'max-h-20'
            } ${disabled ? 'opacity-50 cursor-not-allowed bg-muted' : ''}`}
          />
          {showExpandButton && (isHovering || isFocused) && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute -top-1 left-1/2 -translate-y-1/2 -translate-x-1/2 h-5 w-8 shrink-0 rounded border bg-background hover:bg-muted"
              onClick={() => setIsExpanded((e) => !e)}
              aria-label={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronUp className="h-4 w-4" />
              )}
            </Button>
          )}
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
