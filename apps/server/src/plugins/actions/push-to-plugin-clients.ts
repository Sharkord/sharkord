import {
  PLUGIN_PUSH_MAX_BYTES,
  ServerEvents,
  type TPluginPushEvent
} from '@sharkord/shared';
import { VoiceRuntime } from '../../runtimes/voice';
import { invariant } from '../../utils/invariant';
import { pubsub } from '../../utils/pubsub';
import { getOnlineUserIds } from '../../utils/wss';

const pushToPluginClients = (
  pluginId: string,
  userIds: number[],
  data: unknown
) => {
  invariant(
    Buffer.byteLength(JSON.stringify(data ?? null)) <= PLUGIN_PUSH_MAX_BYTES,
    {
      code: 'BAD_REQUEST',
      message: `A push cannot exceed ${PLUGIN_PUSH_MAX_BYTES} bytes.`
    }
  );

  const payload: TPluginPushEvent = { pluginId, data };

  pubsub.publishFor(userIds, ServerEvents.PLUGIN_PUSH, payload);
};

const pushToAllPluginClients = (pluginId: string, data: unknown) =>
  pushToPluginClients(pluginId, getOnlineUserIds(), data);

const pushToVoiceChannelPluginClients = (
  pluginId: string,
  channelId: number,
  data: unknown
) => {
  const runtime = VoiceRuntime.findById(channelId);
  let userIds: number[] = [];

  if (runtime) {
    const { users } = runtime.getState();

    userIds = users.map(({ userId }) => userId);
  }

  pushToPluginClients(pluginId, userIds, data);
};

export {
  pushToAllPluginClients,
  pushToPluginClients,
  pushToVoiceChannelPluginClients
};
