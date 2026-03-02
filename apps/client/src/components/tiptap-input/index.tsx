import { EmojiPicker } from '@/components/emoji-picker';
import { useCustomEmojis } from '@/features/server/emojis/hooks';
import { BUILT_IN_COMMANDS } from '@/helpers/built-in-commands';
import type { TJoinedPublicUser } from '@sharkord/shared';
import { Button } from '@sharkord/ui';
import type { Extension } from '@tiptap/core';
import Emoji, { gitHubEmojis } from '@tiptap/extension-emoji';
import { splitBlock } from '@tiptap/pm/commands';
import { liftListItem } from '@tiptap/pm/schema-list';
import type { Transaction } from '@tiptap/pm/state';
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
import { FormattingToolbar } from '../formatting-toolbar';
import type { TEmojiItem } from './helpers';
import { CommandSuggestion } from './commands/command-suggestion';
import { Mention } from './commands/mention-extension';
import { MentionNode } from './commands/mention-node';
import {
  MENTION_STORAGE_KEY,
  MentionSuggestion
} from './commands/mention-suggestion';
import { SlashCommands } from './commands/slash-commands-extension';
import { EmojiSuggestion } from './commands/suggestions';

type TTiptapInputProps = {
  disabled?: boolean;
  readOnly?: boolean;
  value?: string;
  onChange?: (html: string) => void;
  onSubmit?: () => void;
  onCancel?: () => void;
  onTyping?: () => void;
  users?: TJoinedPublicUser[];
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
    users
  }: TTiptapInputProps) => {
    const readOnlyRef = useRef(readOnly);
    readOnlyRef.current = readOnly;

    const [isExpanded, setIsExpanded] = useState(false);
    const [hasOverflow, setHasOverflow] = useState(false);
    const [isHovering, setIsHovering] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const editorWrapperRef = useRef<HTMLDivElement>(null);

    const customEmojis = useCustomEmojis();

    const extensions = useMemo((): Extension[] => {
      const exts = [
        StarterKit.configure({
          code: false,
          codeBlock: false,
          hardBreak: {
            HTMLAttributes: {
              class: 'hard-break'
            }
          },
          link: {
            autolink: true,
            defaultProtocol: 'https',
            openOnClick: false,
            HTMLAttributes: {
              target: '_blank',
              rel: 'noopener noreferrer'
            },
            shouldAutoLink: (url: string) => {
              return /^https?:\/\//i.test(url);
            }
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
        SlashCommands.configure({
          commands: BUILT_IN_COMMANDS,
          suggestion: CommandSuggestion
        }) as Extension
      ] as Extension[];

      if (users && users.length > 0) {
        exts.push(MentionNode as Extension);
        exts.push(
          Mention.configure({
            users,
            suggestion: MentionSuggestion
          }) as Extension
        );
      }

      return exts;
    }, [customEmojis, users]);

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

            if (event.ctrlKey) {
              event.preventDefault();
              onSubmit?.();
              return true;
            }

            // Exit heading on Enter — split, then convert new block to paragraph
            const { state } = _view;
            const { $from, empty } = state.selection;
            if (empty && $from.parent.type.name === 'heading') {
              let tr: Transaction | null = null;
              splitBlock(state, (t) => { tr = t; });
              if (tr) {
                const newFrom = (tr as Transaction).selection.$from;
                (tr as Transaction).setBlockType(
                  newFrom.before(),
                  newFrom.after(),
                  state.schema.nodes.paragraph
                );
                _view.dispatch(tr as Transaction);
                event.preventDefault();
                return true;
              }
            }

            // Exit list when pressing Enter in an empty list item
            if (empty) {
              const listItemType = state.schema.nodes.listItem;
              if (listItemType) {
                for (let depth = $from.depth; depth > 0; depth--) {
                  if ($from.node(depth).type === listItemType) {
                    if ($from.node(depth).textContent === '') {
                      return liftListItem(listItemType)(state, _view.dispatch);
                    }
                    break;
                  }
                }
              }
            }

            return false;
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

    // keep emoji storage in sync with custom emojis from the store
    // this ensures newly added emojis appear in autocomplete without refreshing the app
    useEffect(() => {
      if (editor && editor.storage.emoji) {
        editor.storage.emoji.emojis = [...gitHubEmojis, ...customEmojis];
      }
    }, [editor, customEmojis]);

    // keep mention storage in sync with users from the store
    useEffect(() => {
      if (editor && users) {
        const slot = (editor.storage as unknown as Record<string, { users?: TJoinedPublicUser[] }>)[MENTION_STORAGE_KEY];
        if (slot) slot.users = users;
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

    // Measure if content overflows (more than ~3 lines) when collapsed
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
          {(isHovering || isFocused) && <FormattingToolbar editor={editor} />}
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
