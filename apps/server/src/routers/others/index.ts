import { t } from '../../utils/trpc';
import { changeLogoRoute } from './change-logo';
import { onServerSettingsUpdateRoute } from './events';
import { getSettingsRoute } from './get-settings';
import { getStorageSettingsRoute } from './get-storage-settings';
import { getUpdateRoute } from './get-update';
import { handshakeRoute } from './handshake';
import { joinServerRoute } from './join';
import { updateServerRoute } from './update-server';
import { updateSettingsRoute } from './update-settings';
import { useSecretTokenRoute } from './use-secret-token';

export const othersRouter = t.router({
  joinServer: joinServerRoute,
  handshake: handshakeRoute,
  updateSettings: updateSettingsRoute,
  changeLogo: changeLogoRoute,
  getSettings: getSettingsRoute,
  onServerSettingsUpdate: onServerSettingsUpdateRoute,
  useSecretToken: useSecretTokenRoute,
  getStorageSettings: getStorageSettingsRoute,
  getUpdate: getUpdateRoute,
  updateServer: updateServerRoute
});
