import { EmojiPicker } from '@/components/emoji-picker';
import { Button } from '@/components/ui/button';
import { useCustomEmojis } from '@/features/server/emojis/hooks';
import Emoji, { gitHubEmojis } from '@tiptap/extension-emoji';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Smile } from 'lucide-react';
import { memo, useEffect } from 'react';
import { EmojiSuggestion } from './suggestions';
import type { TEmojiItem } from './types';

type TTiptapInputProps = {
  disabled?: boolean;
  value?: string;
  onChange?: (html: string) => void;
  onSubmit?: () => void;
  onCancel?: () => void;
  onTyping?: () => void;
};

const TiptapInput = memo(
  ({
    value,
    onChange,
    onSubmit,
    onCancel,
    onTyping,
    disabled
  }: TTiptapInputProps) => {
    const customEmojis = useCustomEmojis();

    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          hardBreak: {
            HTMLAttributes: {
              class: 'hard-break'
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
        })
      ],
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
        }
      }
    });

    const handleEmojiSelect = (emoji: TEmojiItem) => {
      if (disabled) return;

      if (emoji.shortcodes.length > 0) {
        editor?.chain().focus().setEmoji(emoji.shortcodes[0]).run();
      }
    };

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
      <div className="flex flex-1 items-center gap-2">
        <EditorContent
          editor={editor}
          className={`border p-2 rounded w-full min-h-[40px] tiptap ${
            disabled ? 'opacity-50 cursor-not-allowed bg-muted' : ''
          }`}
        />

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
