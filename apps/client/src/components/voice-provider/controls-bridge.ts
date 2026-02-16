type TVoiceControlsBridge = {
  setMicMuted: (muted: boolean) => Promise<void>;
  setSoundMuted: (muted: boolean) => Promise<void>;
};

// Server settings screens are rendered from a top-level portal and may live
// outside VoiceProvider. This bridge exposes live voice controls to those
// screens without changing the existing provider tree.
let voiceControlsBridge: TVoiceControlsBridge | null = null;

const setVoiceControlsBridge = (bridge: TVoiceControlsBridge) => {
  voiceControlsBridge = bridge;
};

const clearVoiceControlsBridge = () => {
  voiceControlsBridge = null;
};

const getVoiceControlsBridge = () => voiceControlsBridge;

export {
  clearVoiceControlsBridge,
  getVoiceControlsBridge,
  setVoiceControlsBridge
};
