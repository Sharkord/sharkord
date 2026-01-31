const logVoice = (...args: unknown[]) => {
  console.log(
    '%c[VOICE-PROVIDER]',
    'color: salmon; font-weight: bold;',
    ...args
  );
};

const OVERRIDE_DEBUG = true;

const logDebug = (...args: unknown[]) => {
  if (window.DEBUG || OVERRIDE_DEBUG) {
    console.log('%c[DEBUG]', 'color: lightblue; font-weight: bold;', ...args);
  }
};

export { logDebug, logVoice };
