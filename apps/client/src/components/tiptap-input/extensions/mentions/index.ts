import { getRenderedUsername } from '@/helpers/get-rendered-username';
import type { TJoinedPublicUser } from '@sharkord/shared';
import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion from '@tiptap/suggestion';
import { MENTION_STORAGE_KEY, MentionSuggestion } from './suggestion';

export const MentionPluginKey = new PluginKey('mention');

type TMentionOptions = {
  users: TJoinedPublicUser[];
  suggestion: typeof MentionSuggestion;
};

export const Mention = Extension.create<TMentionOptions>({
  name: MENTION_STORAGE_KEY,
  addOptions() {
    return {
      users: [],
      suggestion: MentionSuggestion
    };
  },
  addStorage() {
    return {
      users: this.options.users
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion<TJoinedPublicUser, TJoinedPublicUser>({
        editor: this.editor,
        pluginKey: MentionPluginKey,
        char: '@',
        startOfLine: false,
        allowSpaces: this.options.suggestion.allowSpaces,
        items: this.options.suggestion.items,
        render: this.options.suggestion.render,
        command: ({ editor, range, props }) => {
          const displayName = getRenderedUsername(props);
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent([
              {
                type: 'mention',
                attrs: { userId: props.id, label: displayName }
              },
              { type: 'text', text: ' ' }
            ])
            .run();
        }
      })
    ];
  }
});
