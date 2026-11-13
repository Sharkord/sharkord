import { IconButton } from '@sharkord/ui';
import type { Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { Bold, Code, Italic, SquareCode, type LucideIcon } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type TFormat = 'bold' | 'italic' | 'code' | 'codeBlock';

type TFormatConfig = {
  icon: LucideIcon;
  labelKey: string;
  toggle: (editor: Editor) => void;
};

const FORMATS: Record<TFormat, TFormatConfig> = {
  bold: {
    icon: Bold,
    labelKey: 'formatBold',
    toggle: (editor) => editor.chain().focus().toggleBold().run()
  },
  italic: {
    icon: Italic,
    labelKey: 'formatItalic',
    toggle: (editor) => editor.chain().focus().toggleItalic().run()
  },
  code: {
    icon: Code,
    labelKey: 'formatCode',
    toggle: (editor) => editor.chain().focus().toggleCode().run()
  },
  codeBlock: {
    icon: SquareCode,
    labelKey: 'formatCodeBlock',
    toggle: (editor) => editor.chain().focus().toggleCodeBlock().run()
  }
};

const MENU_OPTIONS = {
  strategy: 'fixed',
  placement: 'top',
  offset: 8
} as const;

const getMenuContainer = () => document.body;

type TFormatButtonProps = {
  editor: Editor;
  format: TFormat;
  active: boolean;
};

const FormatButton = memo(({ editor, format, active }: TFormatButtonProps) => {
  const { t } = useTranslation('common');
  const { icon, labelKey, toggle } = FORMATS[format];

  const onClick = useCallback(() => toggle(editor), [toggle, editor]);

  return (
    <IconButton
      size="sm"
      variant={active ? 'primary' : 'ghost'}
      icon={icon}
      onClick={onClick}
      title={t(labelKey)}
      aria-pressed={active}
    />
  );
});

type TFormattingMenuProps = {
  editor: Editor;
};

const FormattingMenu = memo(({ editor }: TFormattingMenuProps) => {
  const active = useEditorState({
    editor,
    selector: ({ editor }) => ({
      bold: editor.isActive('bold'),
      italic: editor.isActive('italic'),
      code: editor.isActive('code'),
      codeBlock: editor.isActive('codeBlock')
    })
  });

  return (
    <BubbleMenu
      editor={editor}
      appendTo={getMenuContainer}
      options={MENU_OPTIONS}
      className="z-50 flex items-center gap-2 rounded-md border bg-card px-2 py-1 shadow-md"
    >
      <FormatButton editor={editor} format="bold" active={active.bold} />
      <FormatButton editor={editor} format="italic" active={active.italic} />
      <FormatButton editor={editor} format="code" active={active.code} />
      <FormatButton
        editor={editor}
        format="codeBlock"
        active={active.codeBlock}
      />
    </BubbleMenu>
  );
});

export { FormattingMenu };
