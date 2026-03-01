import type { TBuiltInCommand } from '@/helpers/built-in-commands';
import { Node } from '@tiptap/core';
import Suggestion, { type SuggestionOptions } from '@tiptap/suggestion';

export const COMMANDS_STORAGE_KEY = 'slashCommands';

export type SlashCommandsOptions = {
  commands: TBuiltInCommand[];
  suggestion: Omit<SuggestionOptions, 'editor'>;
};

export const SlashCommands = Node.create<SlashCommandsOptions>({
  name: 'slashCommands',

  addOptions() {
    return {
      commands: [],
      suggestion: {
        char: '/',
        startOfLine: true,
        command: ({ editor, range }) => {
          editor.chain().focus().deleteRange(range).run();
        }
      }
    };
  },

  addStorage() {
    return {
      [COMMANDS_STORAGE_KEY]: {
        commands: this.options.commands
      }
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }) => {
          const commands =
            this.editor.storage[this.name]?.[COMMANDS_STORAGE_KEY]?.commands ??
            this.options.commands;

          return commands.filter((cmd: TBuiltInCommand) =>
            cmd.name.toLowerCase().startsWith(query.toLowerCase())
          );
        }
      })
    ];
  }
});
