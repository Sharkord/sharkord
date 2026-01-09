import { t } from '../../utils/trpc';
import { onPluginLogRoute } from './events';
import { executeCommandRoute } from './execute-command';
import { getCommandsRoute } from './get-commands';
import { getPluginLogsRoute } from './get-logs';
import { getPluginsRoute } from './get-plugins';
import { togglePluginRoute } from './toggle-plugin';

export const pluginsRouter = t.router({
  get: getPluginsRoute,
  toggle: togglePluginRoute,
  onLog: onPluginLogRoute,
  getLogs: getPluginLogsRoute,
  getCommands: getCommandsRoute,
  executeCommand: executeCommandRoute
});
