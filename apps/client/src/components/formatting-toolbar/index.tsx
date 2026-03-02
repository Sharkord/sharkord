import { Button } from '@sharkord/ui';
import type { Editor } from '@tiptap/core';
import { Code, CodeXml, Link2, List, ListOrdered, Minus, Quote } from 'lucide-react';
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

/** Wrap the current selection with `wrapper` chars (e.g. backtick). */
function wrapSelection(editor: Editor, wrapper: string) {
  const { from, to } = editor.state.selection;
  const text = editor.state.doc.textBetween(from, to);
  if (text) {
    editor
      .chain()
      .focus()
      .insertContentAt({ from, to }, wrapper + text + wrapper)
      .run();
  } else {
    editor.chain().focus().insertContent(wrapper + wrapper).run();
    // place cursor between the wrappers
    editor.commands.setTextSelection(editor.state.selection.from - wrapper.length);
  }
}

function insertLink(editor: Editor) {
  const { from, to } = editor.state.selection;
  const text = editor.state.doc.textBetween(from, to);
  const link = text ? `[${text}](url)` : '[](url)';
  editor.chain().focus().insertContentAt({ from, to }, link).run();
  if (!text) {
    // place cursor inside the brackets
    editor.commands.setTextSelection(editor.state.selection.from - 5);
  }
}

function insertCodeBlock(editor: Editor) {
  const { from, to } = editor.state.selection;
  const text = editor.state.doc.textBetween(from, to);
  const block = '```\n' + text + '\n```';
  editor
    .chain()
    .focus()
    .insertContentAt({ from, to }, block)
    .run();
}

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
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
        content={<s>S</s>}
      />
      <FormatButton
        onClick={() => insertLink(editor)}
        title="Hyperlink"
        content={<Link2 />}
      />
      <FormatButton
        onClick={() => wrapSelection(editor, '`')}
        title="Inline code"
        content={<Code size={16} />}
      />
      <FormatButton
        onClick={() => insertCodeBlock(editor)}
        title="Code block"
        content={<CodeXml size={16} />}
      />
      <FormatButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Horizontal line"
        content={<Minus />}
      />
      <FormatButton
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Blockquote"
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
