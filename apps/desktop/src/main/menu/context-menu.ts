import {
  Menu,
  type ContextMenuParams,
  type MenuItemConstructorOptions,
  type WebContents
} from 'electron';
import { i18n } from '../i18n';

const buildSpellcheckItems = (
  contents: WebContents,
  { misspelledWord, dictionarySuggestions }: ContextMenuParams
): MenuItemConstructorOptions[] => {
  if (!misspelledWord) {
    return [];
  }

  const suggestions: MenuItemConstructorOptions[] = dictionarySuggestions.map(
    (suggestion) => ({
      label: suggestion,
      click: () => contents.replaceMisspelling(suggestion)
    })
  );

  return [
    ...suggestions,
    {
      label: i18n.t('contextMenu.addToDictionary'),
      click: () =>
        contents.session.addWordToSpellCheckerDictionary(misspelledWord)
    },
    { type: 'separator' }
  ];
};

const buildEditableItems = (
  contents: WebContents,
  { editFlags }: ContextMenuParams
): MenuItemConstructorOptions[] => [
  {
    label: i18n.t('contextMenu.undo'),
    enabled: editFlags.canUndo,
    click: () => contents.undo()
  },
  {
    label: i18n.t('contextMenu.redo'),
    enabled: editFlags.canRedo,
    click: () => contents.redo()
  },
  { type: 'separator' },
  {
    label: i18n.t('contextMenu.cut'),
    enabled: editFlags.canCut,
    click: () => contents.cut()
  },
  {
    label: i18n.t('contextMenu.copy'),
    enabled: editFlags.canCopy,
    click: () => contents.copy()
  },
  {
    label: i18n.t('contextMenu.paste'),
    click: () => contents.paste()
  },
  {
    label: i18n.t('contextMenu.delete'),
    enabled: editFlags.canDelete,
    click: () => contents.delete()
  },
  { type: 'separator' },
  {
    label: i18n.t('contextMenu.selectAll'),
    enabled: editFlags.canSelectAll,
    click: () => contents.selectAll()
  }
];

const attachContextMenu = (contents: WebContents) => {
  contents.on('context-menu', (_event, params) => {
    let items: MenuItemConstructorOptions[] = [];

    if (params.isEditable) {
      items = [
        ...buildSpellcheckItems(contents, params),
        ...buildEditableItems(contents, params)
      ];
    } else if (params.selectionText.trim()) {
      items = [
        {
          label: i18n.t('contextMenu.copy'),
          click: () => contents.copy()
        }
      ];
    }

    if (items.length === 0) {
      return;
    }

    const menu = Menu.buildFromTemplate(items);

    menu.popup();
  });
};

export { attachContextMenu };
