import 'ws';

declare module 'ws' {
  interface WebSocket {
    userId?: number;
    token: string;
  }
}

type TCommandMap = {
  [pluginId: string]: {
    [commandName: string]: TCommand;
  };
};

type TCommand = (...args: unknown[]) => Promise<unknown> | unknown;

declare global {
  interface Window {
    __plugins?: {
      commands: TCommandMap;
    };
  }
}

declare module 'bun' {
  interface Env {
    // SHARKORD_ prefixed environment variables
    SHARKORD_PORT?: string;
    SHARKORD_DEBUG?: string;
    SHARKORD_AUTOUPDATE?: string;
    SHARKORD_WEBRTC_PORT?: string;
    SHARKORD_WEBRTC_ANNOUNCED_ADDRESS?: string;
  }
}
