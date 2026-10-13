import { getErrorMessage } from '@sharkord/shared';
import { isDebug } from './is-debug';
import { pushVoiceDebugEvent } from './voice-debug';

type TLogger = {
  info: (message: string, data?: object) => void;
  warn: (message: string, data?: object) => void;
  error: (message: string, error: unknown, data?: object) => void;
};

const getErrorCode = (error: unknown): string | undefined => {
  const code = (error as { data?: { code?: unknown } } | undefined)?.data?.code;

  return typeof code === 'string' ? code : undefined;
};

type TLogSink = typeof pushVoiceDebugEvent;

const getStyle = (color: string) => `color: ${color}; font-weight: bold;`;

const skipSink: TLogSink = () => {};

const createLogger = (
  label: string,
  color: string,
  sink: TLogSink = skipSink
): TLogger => {
  const tag = `%c[${label}]`;

  return {
    info: (message, data) => {
      sink('voice', message, data);

      console.log(tag, getStyle(color), message, data);
    },
    warn: (message, data) => {
      sink('warn', message, data);

      console.warn(tag, getStyle('orange'), message, data);
    },
    error: (message, error, data) => {
      const payload = {
        ...data,
        error: getErrorMessage(error),
        code: getErrorCode(error)
      };

      sink('error', message, payload);

      console.error(tag, getStyle('red'), message, payload);
    }
  };
};

const voiceLogger = createLogger('VOICE', 'salmon', pushVoiceDebugEvent);
const bridgeLogger = createLogger('BRIDGE', 'teal');

const logDebug = (...args: unknown[]) => {
  if (isDebug()) {
    console.log('%c[DEBUG]', getStyle('lightblue'), ...args);
  }
};

export { bridgeLogger, logDebug, voiceLogger };
