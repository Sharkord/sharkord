import type { TCommandInfo } from '@sharkord/shared';
import type { Editor } from '@tiptap/core';
import { createSuggestionRenderer } from '../create-suggestion-renderer';
import { SUGGESTION_LIMIT } from '../filter-by-query';
import { CommandList } from './command-list';

const COMMANDS_STORAGE_KEY = 'slashCommands';

// commands match on plugin id and description too, so they cannot use filterByQuery
const getCommands = ({
  editor,
  query
}: {
  editor: Editor;
  query: string;
}): TCommandInfo[] => {
  const commands: TCommandInfo[] =
    (
      editor.storage as unknown as Record<string, { commands?: TCommandInfo[] }>
    )[COMMANDS_STORAGE_KEY]?.commands ?? [];

  if (!query) return commands.slice(0, SUGGESTION_LIMIT);

  const normalizedQuery = query.toLowerCase();

  return commands
    .filter(
      (command) =>
        command.name.toLowerCase().includes(normalizedQuery) ||
        command.pluginId.toLowerCase().startsWith(normalizedQuery) ||
        command.description?.toLowerCase().includes(normalizedQuery)
    )
    .sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();

      const aStartsWith = aName.startsWith(normalizedQuery);
      const bStartsWith = bName.startsWith(normalizedQuery);

      if (aStartsWith !== bStartsWith) {
        return aStartsWith ? -1 : 1;
      }

      return aStartsWith ? aName.length - bName.length : 0;
    })
    .slice(0, SUGGESTION_LIMIT);
};

export const CommandSuggestion = {
  char: '/',
  startOfLine: true,
  items: getCommands,
  allowSpaces: true,
  render: createSuggestionRenderer(CommandList, getCommands)
};

export { COMMANDS_STORAGE_KEY };
