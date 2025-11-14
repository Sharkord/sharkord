const logVoice = (...args: unknown[]) => {
  console.log('%c[VOICE-PROVIDER]', 'color: purple; font-weight: bold;', ...args);
};

export { logVoice };
