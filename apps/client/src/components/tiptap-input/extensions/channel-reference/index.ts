import type { TChannel } from '@sharkord/shared';
import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import Suggestion from '@tiptap/suggestion';
import {
  CHANNEL_REF_STORAGE_KEY,
  ChannelReferenceSuggestion
} from './suggestion';

export const ChannelReferencePluginKey = new PluginKey('channelReference');

type TChannelReferenceOptions = {
  channels: TChannel[];
  suggestion: typeof ChannelReferenceSuggestion;
};

export const ChannelReference = Extension.create<TChannelReferenceOptions>({
  name: CHANNEL_REF_STORAGE_KEY,
  addOptions() {
    return {
      channels: [],
      suggestion: ChannelReferenceSuggestion
    };
  },
  addStorage() {
    return {
      channels: this.options.channels
    };
  },
  addProseMirrorPlugins() {
    return [
      Suggestion<TChannel, TChannel>({
        editor: this.editor,
        pluginKey: ChannelReferencePluginKey,
        char: '#',
        startOfLine: false,
        allowSpaces: this.options.suggestion.allowSpaces,
        items: this.options.suggestion.items,
        render: this.options.suggestion.render,
        command: ({ editor, range, props }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent([
              {
                type: 'channelReference',
                attrs: { channelId: props.id, label: props.name }
              },
              { type: 'text', text: ' ' }
            ])
            .run();
        }
      })
    ];
  }
});
