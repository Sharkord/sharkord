import { t } from '../../utils/trpc';
import { changeLogoRoute } from './change-logo';
import { onServerSettingsUpdateRoute } from './events';
import { getGiphyConfigRoute } from './get-giphy-config';
import { getSettingsRoute } from './get-settings';
import { getStorageSettingsRoute } from './get-storage-settings';
import { getUpdateRoute } from './get-update';
import { giphySearchRoute, giphyTrendingRoute } from './giphy';
import { handshakeRoute } from './handshake';
import { joinServerRoute } from './join';
import { updateGiphyConfigRoute } from './update-giphy-config';
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
  updateServer: updateServerRoute,
  getGiphyConfig: getGiphyConfigRoute,
  updateGiphyConfig: updateGiphyConfigRoute,
  giphySearch: giphySearchRoute,
  giphyTrending: giphyTrendingRoute
});
