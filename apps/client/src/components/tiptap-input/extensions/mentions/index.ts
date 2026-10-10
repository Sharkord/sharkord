import type { TJoinedPublicUser, TJoinedRole } from '@sharkord/shared';
import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion from '@tiptap/suggestion';
import {
  getMentionItemName,
  MENTION_STORAGE_KEY,
  MentionSuggestion,
  type TMentionItem
} from './suggestion';

export const MentionPluginKey = new PluginKey('mention');

type TMentionOptions = {
  users: TJoinedPublicUser[];
  roles: TJoinedRole[];
  suggestion: typeof MentionSuggestion;
};

export const Mention = Extension.create<TMentionOptions>({
  name: MENTION_STORAGE_KEY,
  addOptions() {
    return {
      users: [],
      roles: [],
      suggestion: MentionSuggestion
    };
  },
  addStorage() {
    return {
      users: this.options.users,
      roles: this.options.roles
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion<TMentionItem, TMentionItem>({
        editor: this.editor,
        pluginKey: MentionPluginKey,
        char: '@',
        startOfLine: false,
        allowSpaces: this.options.suggestion.allowSpaces,
        items: this.options.suggestion.items,
        render: this.options.suggestion.render,
        command: ({ editor, range, props }) => {
          const label = getMentionItemName(props);
          const mentionNode =
            props.type === 'user'
              ? { type: 'mention', attrs: { userId: props.user.id, label } }
              : {
                  type: 'roleMention',
                  attrs: { roleId: props.role.id, label }
                };

          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent([mentionNode, { type: 'text', text: ' ' }])
            .run();
        }
      })
    ];
  }
});
