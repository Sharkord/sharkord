import { t } from '../../utils/trpc';
import { onCommandsChangeRoute, onPluginLogRoute } from './events';
import { executeCommandRoute } from './execute-command';
import { getCommandsRoute } from './get-commands';
import { getPluginLogsRoute } from './get-logs';
import { getPluginsRoute } from './get-plugins';
import { getSettingsRoute } from './get-settings';
import { togglePluginRoute } from './toggle-plugin';
import { updateSettingRoute } from './update-setting';

export const pluginsRouter = t.router({
  get: getPluginsRoute,
  toggle: togglePluginRoute,
  onLog: onPluginLogRoute,
  getLogs: getPluginLogsRoute,
  getCommands: getCommandsRoute,
  executeCommand: executeCommandRoute,
  onCommandsChange: onCommandsChangeRoute,
  getSettings: getSettingsRoute,
  updateSetting: updateSettingRoute
});
