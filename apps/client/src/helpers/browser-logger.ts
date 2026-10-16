import { getErrorMessage } from '@sharkord/shared';
import { isDebug } from './is-debug';
import { pushVoiceDebugEvent } from './voice-debug';

const logVoice = (message: string, data?: object) => {
  pushVoiceDebugEvent('voice', message, data);

  console.log('%c[VOICE]', 'color: salmon; font-weight: bold;', message, data);
};

const logVoiceWarn = (message: string, data?: object) => {
  pushVoiceDebugEvent('warn', message, data);

  console.warn('%c[VOICE]', 'color: orange; font-weight: bold;', message, data);
};

const getErrorCode = (error: unknown): string | undefined => {
  const code = (error as { data?: { code?: unknown } } | undefined)?.data?.code;

  return typeof code === 'string' ? code : undefined;
};

const logVoiceError = (message: string, error: unknown, data?: object) => {
  const payload = {
    ...data,
    error: getErrorMessage(error),
    code: getErrorCode(error)
  };

  pushVoiceDebugEvent('error', message, payload);

  console.error(
    '%c[VOICE]',
    'color: red; font-weight: bold;',
    message,
    payload
  );
};

const logDebug = (...args: unknown[]) => {
  if (isDebug()) {
    console.log('%c[DEBUG]', 'color: lightblue; font-weight: bold;', ...args);
  }
};

export { logDebug, logVoice, logVoiceError, logVoiceWarn };
