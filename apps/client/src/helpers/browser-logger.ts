const logVoice = (...args: unknown[]) => {
  console.log(
    '%c[VOICE-PROVIDER]',
    'color: salmon; font-weight: bold;',
    ...args
  );
};

const logDebug = (...args: unknown[]) => {
  if (window.DEBUG) {
    console.log('%c[DEBUG]', 'color: lightblue; font-weight: bold;', ...args);
  }
};

export { logDebug, logVoice };
