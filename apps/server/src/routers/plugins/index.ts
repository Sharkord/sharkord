import { t } from '../../utils/trpc';
import {
  onCommandsChangeRoute,
  onComponentAccessChangeRoute,
  onComponentsChangeRoute,
  onMetadataChangeRoute,
  onPluginLogRoute
} from './events';
import { executeActionRoute } from './execute-action';
import { executeCommandRoute } from './execute-command';
import { getCapabilitiesRoute } from './get-capabilities';
import { getCommandsRoute } from './get-commands';
import { getPluginLogsRoute } from './get-logs';
import { getPluginsRoute } from './get-plugins';
import { getSettingsRoute } from './get-settings';
import { installRoute } from './install-plugin';
import { removeRoute } from './remove-plugin';
import { resetCapabilityAccessRoute } from './reset-capability-access';
import { setCapabilityAccessRoute } from './set-capability-access';
import { togglePluginRoute } from './toggle-plugin';
import { updateRoute } from './update-plugin';
import { updateSettingRoute } from './update-setting';

export const pluginsRouter = t.router({
  get: getPluginsRoute,
  toggle: togglePluginRoute,
  onLog: onPluginLogRoute,
  getLogs: getPluginLogsRoute,
  getCommands: getCommandsRoute,
  getCapabilities: getCapabilitiesRoute,
  setCapabilityAccess: setCapabilityAccessRoute,
  resetCapabilityAccess: resetCapabilityAccessRoute,
  executeCommand: executeCommandRoute,
  executeAction: executeActionRoute,
  onCommandsChange: onCommandsChangeRoute,
  onComponentsChange: onComponentsChangeRoute,
  onComponentAccessChange: onComponentAccessChangeRoute,
  onMetadataChange: onMetadataChangeRoute,
  getSettings: getSettingsRoute,
  updateSetting: updateSettingRoute,
  install: installRoute,
  update: updateRoute,
  remove: removeRoute
});
