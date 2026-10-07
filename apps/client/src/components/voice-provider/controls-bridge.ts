type TVoiceControlsBridge = {
  setMicMuted: (muted: boolean) => Promise<void>;
  setSoundMuted: (muted: boolean) => Promise<void>;
  startScreenShare: () => Promise<void>;
};

// Top-level dialogs and server settings screens may live outside VoiceProvider.
// This bridge exposes live voice controls to those UI surfaces without changing
// the existing provider tree.
let voiceControlsBridge: TVoiceControlsBridge | null = null;

const setVoiceControlsBridge = (bridge: TVoiceControlsBridge) => {
  voiceControlsBridge = bridge;
};

const clearVoiceControlsBridge = () => {
  voiceControlsBridge = null;
};

const getVoiceControlsBridge = () => voiceControlsBridge;

const startScreenShareFromBridge = () => {
  if (!voiceControlsBridge) return false;

  void voiceControlsBridge.startScreenShare();
  return true;
};

export {
  clearVoiceControlsBridge,
  getVoiceControlsBridge,
  setVoiceControlsBridge,
  startScreenShareFromBridge
};
