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

const MAX_LOGS_PER_PLUGIN = 1000;

class PluginLogger {
  private logs = new Map<string, TLogEntry[]>();

  public log = (pluginId: string, type: LogType, ...message: unknown[]) => {
    const parsedMessage = message
      .map((m) => (typeof m === 'object' ? JSON.stringify(m) : String(m)))
      .join(' ');

    logger[type](
      `${chalk.magentaBright(`[plugin:${pluginId}]`)} ${parsedMessage}`
    );

    const pluginLogs = this.logs.get(pluginId) ?? [];

    const newLog: TLogEntry = {
      type,
      timestamp: Date.now(),
      message: parsedMessage,
      pluginId
    };

    pluginLogs.push(newLog);

    if (pluginLogs.length > MAX_LOGS_PER_PLUGIN) {
      pluginLogs.shift();
    }

    this.logs.set(pluginId, pluginLogs);

    pubsub.publish(ServerEvents.PLUGIN_LOG, newLog);
  };

  public getLogs = (pluginId: string): TLogEntry[] =>
    this.logs.get(pluginId) ?? [];

  public clear = (pluginId: string) => {
    this.logs.delete(pluginId);
  };

  public createScopedLogger = (pluginId: string): ScopedLogger => ({
    log: (...message: unknown[]) => this.log(pluginId, 'info', ...message),
    debug: (...message: unknown[]) => this.log(pluginId, 'debug', ...message),
    error: (...message: unknown[]) => this.log(pluginId, 'error', ...message)
  });
}

const pluginLogger = new PluginLogger();

export { PluginLogger, pluginLogger };
export type { ScopedLogger };
