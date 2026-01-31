import type { TCommandInfo } from '@sharkord/shared';
import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion from '@tiptap/suggestion';
import { COMMANDS_STORAGE_KEY, CommandSuggestion } from './command-suggestion';

export const SlashCommandsPluginKey = new PluginKey('slashCommands');

export interface SlashCommandsOptions {
  commands: TCommandInfo[];
  suggestion: typeof CommandSuggestion;
}

export const SlashCommands = Extension.create<SlashCommandsOptions>({
  name: COMMANDS_STORAGE_KEY,
  addOptions() {
    return {
      commands: [],
      suggestion: CommandSuggestion
    };
  },
  addStorage() {
    return {
      commands: this.options.commands
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion<TCommandInfo, TCommandInfo>({
        editor: this.editor,
        pluginKey: SlashCommandsPluginKey,
        char: this.options.suggestion.char,
        startOfLine: this.options.suggestion.startOfLine,
        allowSpaces: this.options.suggestion.allowSpaces,
        items: this.options.suggestion.items,
        render: this.options.suggestion.render,
        command: ({ editor, range, props }) => {
          const commandText = `/${props.name} `;

          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent(commandText)
            .run();
        }
      })
    ];
  }
});
