import { t } from '../../utils/trpc';
import {
  onCapabilityAccessChangeRoute,
  onCommandsChangeRoute,
  onComponentsChangeRoute,
  onMetadataChangeRoute,
  onPluginLogRoute,
  onPushRoute
} from './events';
import { executeActionRoute } from './execute-action';
import { executeCommandRoute } from './execute-command';
import { getCapabilitiesRoute } from './get-capabilities';
import { getCommandsRoute } from './get-commands';
import { getPluginLogsRoute } from './get-logs';
import { getPluginsRoute } from './get-plugins';
import { getSettingsRoute } from './get-settings';
import { getUserDataRoute } from './get-user-data';
import { installRoute } from './install-plugin';
import { removeRoute } from './remove-plugin';
import { resetCapabilityAccessRoute } from './reset-capability-access';
import { setCapabilityAccessRoute } from './set-capability-access';
import { setUserDataRoute } from './set-user-data';
import { togglePluginRoute } from './toggle-plugin';
import { updateSettingRoute } from './update-setting';

export const pluginsRouter = t.router({
  get: getPluginsRoute,
  toggle: togglePluginRoute,
  onLog: onPluginLogRoute,
  onPush: onPushRoute,
  getLogs: getPluginLogsRoute,
  getCommands: getCommandsRoute,
  getCapabilities: getCapabilitiesRoute,
  getUserData: getUserDataRoute,
  setUserData: setUserDataRoute,
  setCapabilityAccess: setCapabilityAccessRoute,
  resetCapabilityAccess: resetCapabilityAccessRoute,
  executeCommand: executeCommandRoute,
  executeAction: executeActionRoute,
  onCommandsChange: onCommandsChangeRoute,
  onComponentsChange: onComponentsChangeRoute,
  onCapabilityAccessChange: onCapabilityAccessChangeRoute,
  onMetadataChange: onMetadataChangeRoute,
  getSettings: getSettingsRoute,
  updateSetting: updateSettingRoute,
  install: installRoute,
  update: installRoute,
  remove: removeRoute
});
