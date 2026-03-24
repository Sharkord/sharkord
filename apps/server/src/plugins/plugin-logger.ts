import { ServerEvents, type TLogEntry } from '@sharkord/shared';
import chalk from 'chalk';
import { logger } from '../logger';
import { pubsub } from '../utils/pubsub';

type LogType = 'info' | 'error' | 'debug';

type ScopedLogger = {
  log: (...message: unknown[]) => void;
  debug: (...message: unknown[]) => void;
  error: (...message: unknown[]) => void;
};

class PluginLogger {
  private logs = new Map<string, TLogEntry[]>();
  private logsListeners = new Map<string, Set<(newLog: TLogEntry) => void>>();

  public log = (pluginId: string, type: LogType, ...message: unknown[]) => {
    if (!this.logs.has(pluginId)) {
      this.logs.set(pluginId, []);
    }

    const loggerFn = logger[type];
    const parsedMessage = message
      .map((m) => (typeof m === 'object' ? JSON.stringify(m) : String(m)))
      .join(' ');

    loggerFn(`${chalk.magentaBright(`[plugin:${pluginId}]`)} ${parsedMessage}`);

    const pluginLogs = this.logs.get(pluginId)!;

    const newLog: TLogEntry = {
      type,
      timestamp: Date.now(),
      message: parsedMessage,
      pluginId
    };

    pluginLogs.push(newLog);

    // keep only the last 1000 logs per plugin
    if (pluginLogs.length > 1000) {
      pluginLogs.shift();
    }

    const listeners = this.logsListeners.get(pluginId);

    if (listeners) {
      for (const listener of listeners) {
        listener(newLog);
      }
    }

    pubsub.publish(ServerEvents.PLUGIN_LOG, newLog);
  };

  public getLogs = (pluginId: string): TLogEntry[] => {
    return this.logs.get(pluginId) || [];
  };

  public onLog = (pluginId: string, listener: (newLog: TLogEntry) => void) => {
    if (!this.logsListeners.has(pluginId)) {
      this.logsListeners.set(pluginId, new Set());
    }

    this.logsListeners.get(pluginId)!.add(listener);

    return () => {
      const listeners = this.logsListeners.get(pluginId);

      if (listeners) {
        listeners.delete(listener);

        if (listeners.size === 0) {
          this.logsListeners.delete(pluginId);
        }
      }
    };
  };

  public createScopedLogger = (pluginId: string): ScopedLogger => {
    return {
      log: (...message: unknown[]) => {
        this.log(pluginId, 'info', ...message);
      },
      debug: (...message: unknown[]) => {
        this.log(pluginId, 'debug', ...message);
      },
      error: (...message: unknown[]) => {
        this.log(pluginId, 'error', ...message);
      }
    };
  };
}

export { PluginLogger };
export type { ScopedLogger };
