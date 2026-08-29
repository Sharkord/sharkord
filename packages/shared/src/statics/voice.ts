export const DEFAULT_BITRATE = 6000; // kbps

export const VOICE_REACTION_EMOJIS = [
  '💖',
  '👍',
  '🎉',
  '👏',
  '😄',
  '😮',
  '😢',
  '🤔',
  '👎'
] as const;

export type TVoiceReactionEmoji = (typeof VOICE_REACTION_EMOJIS)[number];
