import type {
  ServerEvents,
  StreamKind,
  TCategory,
  TChannel,
  TChannelUserPermissionsMap,
  TCommandsMapByPlugin,
  TExternalStream,
  TJoinedEmoji,
  TJoinedMessage,
  TJoinedPublicUser,
  TJoinedRole,
  TLogEntry,
  TPublicServerSettings,
  TVoiceUserState
} from '@sharkord/shared';
import type { Unsubscribable } from '@trpc/server/observable';
import { observable, type Observable } from '@trpc/server/observable';
import { EventEmitter } from 'events';

type Events = {
  [ServerEvents.NEW_MESSAGE]: TJoinedMessage;
  [ServerEvents.MESSAGE_UPDATE]: TJoinedMessage;
  [ServerEvents.MESSAGE_DELETE]: {
    messageId: number;
    channelId: number;
  };
  [ServerEvents.MESSAGE_TYPING]: {
    channelId: number;
    userId: number;
  };

  [ServerEvents.USER_JOIN]: TJoinedPublicUser;
  [ServerEvents.USER_LEAVE]: number;
  [ServerEvents.USER_CREATE]: TJoinedPublicUser;
  [ServerEvents.USER_UPDATE]: TJoinedPublicUser;
  [ServerEvents.USER_DELETE]: number;

  [ServerEvents.CHANNEL_CREATE]: TChannel;
  [ServerEvents.CHANNEL_UPDATE]: TChannel;
  [ServerEvents.CHANNEL_DELETE]: number;
  [ServerEvents.CHANNEL_PERMISSIONS_UPDATE]: TChannelUserPermissionsMap;
  [ServerEvents.CHANNEL_READ_STATES_UPDATE]: {
    channelId: number;
    count: number;
  };

  [ServerEvents.USER_JOIN_VOICE]: {
    channelId: number;
    userId: number;
    state: TVoiceUserState;
  };
  [ServerEvents.USER_LEAVE_VOICE]: {
    channelId: number;
    userId: number;
  };
  [ServerEvents.USER_VOICE_STATE_UPDATE]: {
    channelId: number;
    userId: number;
    state: TVoiceUserState;
  };

  [ServerEvents.VOICE_NEW_PRODUCER]: {
    channelId: number;
    remoteId: number;
    kind: StreamKind;
  };
  [ServerEvents.VOICE_ADD_EXTERNAL_STREAM]: {
    channelId: number;
    streamId: number;
    stream: TExternalStream;
  };
  [ServerEvents.VOICE_UPDATE_EXTERNAL_STREAM]: {
    channelId: number;
    streamId: number;
    stream: TExternalStream;
  };
  [ServerEvents.VOICE_REMOVE_EXTERNAL_STREAM]: {
    channelId: number;
    streamId: number;
  };
  [ServerEvents.VOICE_PRODUCER_CLOSED]: {
    channelId: number;
    remoteId: number;
    kind: StreamKind;
  };

  [ServerEvents.PLUGIN_LOG]: TLogEntry;
  [ServerEvents.PLUGIN_COMMANDS_CHANGE]: TCommandsMapByPlugin;

  [ServerEvents.EMOJI_CREATE]: TJoinedEmoji;
  [ServerEvents.EMOJI_UPDATE]: TJoinedEmoji;
  [ServerEvents.EMOJI_DELETE]: number;

  [ServerEvents.ROLE_CREATE]: TJoinedRole;
  [ServerEvents.ROLE_UPDATE]: TJoinedRole;
  [ServerEvents.ROLE_DELETE]: number;

  [ServerEvents.SERVER_SETTINGS_UPDATE]: TPublicServerSettings;

  [ServerEvents.CATEGORY_CREATE]: TCategory;
  [ServerEvents.CATEGORY_UPDATE]: TCategory;
  [ServerEvents.CATEGORY_DELETE]: number;
};

class PubSub {
  private ee: EventEmitter;
  private userListeners: Map<
    number,
    Map<string, Set<(data: Events[keyof Events]) => void>>
  > = new Map();
  private channelListeners: Map<
    number,
    Map<string, Set<(data: Events[keyof Events]) => void>>
  > = new Map();

  constructor() {
    this.ee = new EventEmitter();

    this.ee.setMaxListeners(50);
  }

  public publish<TTopic extends keyof Events>(
    topic: TTopic,
    payload: Events[TTopic]
  ): void {
    this.ee.emit(topic, payload);
  }

  public publishFor<TTopic extends keyof Events>(
    userIds: number | number[],
    topic: TTopic,
    payload: Events[TTopic]
  ): void {
    const targetUserIds = Array.isArray(userIds) ? userIds : [userIds];

    for (const userId of targetUserIds) {
      const userTopics = this.userListeners.get(userId);

      if (!userTopics) continue;

      const listeners = userTopics.get(topic);

      if (!listeners) continue;

      for (const listener of listeners) {
        listener(payload);
      }
    }
  }

  public subscribe<TTopic extends keyof Events>(
    topic: TTopic
  ): Observable<Events[TTopic], unknown> {
    return observable((observer) => {
      const listener = (data: Events[TTopic]) => {
        observer.next(data);
      };

      this.ee.on(topic, listener);

      const ee = this.ee;

      const unsubscribable: Unsubscribable = {
        unsubscribe() {
          ee.off(topic, listener);
        }
      };

      return unsubscribable;
    });
  }

  public subscribeFor<TTopic extends keyof Events>(
    userId: number,
    topic: TTopic
  ): Observable<Events[TTopic], unknown> {
    return observable((observer) => {
      const listener = (data: Events[TTopic]) => {
        observer.next(data);
      };

      if (!this.userListeners.has(userId)) {
        this.userListeners.set(userId, new Map());
      }

      const userTopics = this.userListeners.get(userId)!;

      if (!userTopics.has(topic)) {
        userTopics.set(topic, new Set());
      }

      userTopics
        .get(topic)!
        .add(listener as (data: Events[keyof Events]) => void);

      const unsubscribable: Unsubscribable = {
        unsubscribe: () => {
          const userTopics = this.userListeners.get(userId);

          if (!userTopics) return;

          const listeners = userTopics.get(topic);

          if (!listeners) return;

          listeners.delete(listener as (data: Events[keyof Events]) => void);

          if (listeners.size === 0) {
            userTopics.delete(topic);
          }

          if (userTopics.size === 0) {
            this.userListeners.delete(userId);
          }
        }
      };

      return unsubscribable;
    });
  }

  public publishForChannel<TTopic extends keyof Events>(
    channelId: number,
    topic: TTopic,
    payload: Events[TTopic]
  ): void {
    const channelTopics = this.channelListeners.get(channelId);

    if (!channelTopics) return;

    const listeners = channelTopics.get(topic);

    if (!listeners) return;

    for (const listener of listeners) {
      listener(payload);
    }
  }

  public subscribeForChannel<TTopic extends keyof Events>(
    channelId: number,
    topic: TTopic
  ): Observable<Events[TTopic], unknown> {
    return observable((observer) => {
      const listener = (data: Events[TTopic]) => {
        observer.next(data);
      };

      if (!this.channelListeners.has(channelId)) {
        this.channelListeners.set(channelId, new Map());
      }

      const channelTopics = this.channelListeners.get(channelId)!;

      if (!channelTopics.has(topic)) {
        channelTopics.set(topic, new Set());
      }

      channelTopics
        .get(topic)!
        .add(listener as (data: Events[keyof Events]) => void);

      const unsubscribable: Unsubscribable = {
        unsubscribe: () => {
          const channelTopics = this.channelListeners.get(channelId);

          if (!channelTopics) return;

          const listeners = channelTopics.get(topic);

          if (!listeners) return;

          listeners.delete(listener as (data: Events[keyof Events]) => void);

          if (listeners.size === 0) {
            channelTopics.delete(topic);
          }

          if (channelTopics.size === 0) {
            this.channelListeners.delete(channelId);
          }
        }
      };

      return unsubscribable;
    });
  }
}

export const pubsub = new PubSub();
