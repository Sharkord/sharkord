import { Button } from '@sharkord/ui';
import type { Editor } from '@tiptap/core';
import { Link2, List, ListOrdered, Minus, Quote } from 'lucide-react';
import { memo } from 'react';

type FormattingToolbarProps = {
  editor: Editor;
};

type FormatButtonProps = {
  onClick: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  title: string;
  content: React.ReactNode;
};

const FormatButton = ({ onClick, title, content }: FormatButtonProps) => (
  <Button
    variant="ghost"
    size="sm"
    className="text-muted-foreground w-10 h-10"
    onClick={onClick}
    title={title}
  >
    {content}
  </Button>
);

const FormattingToolbar = memo(({ editor }: FormattingToolbarProps) => {
  return (
    <div
      className="absolute -translate-y-full rounded
            border bg-background shadow-xs
            dark:border-input
            flex items-center"
    >
      <FormatButton
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
        content={<strong>B</strong>}
      />
      <FormatButton
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
        content={<i>I</i>}
      />
      <FormatButton
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Underline"
        content={<u>U</u>}
      />
      <FormatButton
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
        content={<s>S</s>}
      />
      <FormatButton
        onClick={() => editor.chain().focus().toggleLink().run()}
        title="Hyperlink"
        content={<Link2 />}
      />
      <FormatButton
        onClick={() => editor.chain().focus().toggleCode().run()}
        title="Code"
        content={'<>'}
      />
      <FormatButton
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        title="Codeblock"
        content={'<;>'}
      />
      <FormatButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal line"
        content={<Minus />}
      />
      <FormatButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Blockquete"
        content={<Quote />}
      />
      <FormatButton
        onClick={() =>
          editor
            .chain()
            .focus()
            .toggleList('bulletList', 'listItem', false)
            .run()
        }
        title="Bullet list"
        content={<List />}
      />
      <FormatButton
        onClick={() =>
          editor
            .chain()
            .focus()
            .toggleList('orderedList', 'listItem', false)
            .run()
        }
        title="Ordered list"
        content={<ListOrdered />}
      />
    </div>
  );
});

export { FormattingToolbar };
