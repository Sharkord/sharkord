import type { TFile } from '@sharkord/shared';
import { gitHubEmojis } from '@tiptap/extension-emoji';

// a custom emoji can share a built-in's name, and only its file says which one
// it is, so a file always wins. a reaction picked in the client arrives as a
// shortcode, but one a plugin sends can be the raw character
export const findGitHubEmoji = (emoji: string, file: TFile | null) => {
  if (file) return undefined;

  return gitHubEmojis.find(
    (e) => e.name === emoji || e.shortcodes.includes(emoji) || e.emoji === emoji
  );
};
