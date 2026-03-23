import { t } from '../../utils/trpc';
import {
  onCommandsChangeRoute,
  onComponentsChangeRoute,
  onMetadataChangeRoute,
  onPluginLogRoute
} from './events';
import { executeActionRoute } from './execute-action';
import { executeCommandRoute } from './execute-command';
import { getCommandsRoute } from './get-commands';
import { getPluginLogsRoute } from './get-logs';
import { getPluginsRoute } from './get-plugins';
import { getSettingsRoute } from './get-settings';
import { installRoute } from './install-plugin';
import { removeRoute } from './remove-plugin';
import { togglePluginRoute } from './toggle-plugin';
import { updateRoute } from './update-plugin';
import { updateSettingRoute } from './update-setting';

export const pluginsRouter = t.router({
  get: getPluginsRoute,
  toggle: togglePluginRoute,
  onLog: onPluginLogRoute,
  getLogs: getPluginLogsRoute,
  getCommands: getCommandsRoute,
  executeCommand: executeCommandRoute,
  executeAction: executeActionRoute,
  onCommandsChange: onCommandsChangeRoute,
  onComponentsChange: onComponentsChangeRoute,
  onMetadataChange: onMetadataChangeRoute,
  getSettings: getSettingsRoute,
  updateSetting: updateSettingRoute,
  install: installRoute,
  update: updateRoute,
  remove: removeRoute
});
