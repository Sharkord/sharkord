import {
  PLUGIN_PUSH_MAX_BYTES,
  ServerEvents,
  type TPluginPushEvent
} from '@sharkord/shared';
import { invariant } from '../../utils/invariant';
import { pubsub } from '../../utils/pubsub';
import { getOnlineUserIds } from '../../utils/wss';

const pushToPluginClients = (
  pluginId: string,
  userIds: number[],
  data: unknown
) => {
  invariant(JSON.stringify(data ?? null).length <= PLUGIN_PUSH_MAX_BYTES, {
    code: 'BAD_REQUEST',
    message: `A push cannot exceed ${PLUGIN_PUSH_MAX_BYTES} bytes.`
  });

  const payload: TPluginPushEvent = { pluginId, data };

  pubsub.publishFor(userIds, ServerEvents.PLUGIN_PUSH, payload);
};

const pushToAllPluginClients = (pluginId: string, data: unknown) =>
  pushToPluginClients(pluginId, getOnlineUserIds(), data);

export { pushToAllPluginClients, pushToPluginClients };
