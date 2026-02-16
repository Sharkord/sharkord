import type { TPinnedCard } from '@/components/channel-view/voice/hooks/use-pin-card-controller';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  TCategory,
  TChannel,
  TChannelUserPermissionsMap,
  TCommandInfo,
  TCommandsMapByPlugin,
  TExternalStream,
  TExternalStreamsMap,
  TJoinedEmoji,
  TJoinedMessage,
  TJoinedPublicUser,
  TJoinedRole,
  TPublicServerSettings,
  TReadStateMap,
  TServerInfo,
  TVoiceMap,
  TVoiceUserState
} from '@sharkord/shared';
import type { TDisconnectInfo, TMessagesMap } from './types';

export interface IServerState {
  connected: boolean;
  connecting: boolean;
  disconnectInfo?: TDisconnectInfo;
  serverId?: string;
  categories: TCategory[];
  channels: TChannel[];
  emojis: TJoinedEmoji[];
  ownUserId: number | undefined;
  selectedChannelId: number | undefined;
  currentVoiceChannelId: number | undefined;
  messagesMap: TMessagesMap;
  users: TJoinedPublicUser[];
  roles: TJoinedRole[];
  publicSettings: TPublicServerSettings | undefined;
  info: TServerInfo | undefined;
  loadingInfo: boolean;
  typingMap: {
    [channelId: number]: number[];
  };
  voiceMap: TVoiceMap;
  externalStreamsMap: TExternalStreamsMap;
  ownVoiceState: TVoiceUserState;
  pinnedCard: TPinnedCard | undefined;
  channelPermissions: TChannelUserPermissionsMap;
  readStatesMap: {
    [channelId: number]: number | undefined;
  };
  pluginCommands: TCommandsMapByPlugin;
}

const initialState: IServerState = {
  connected: false,
  connecting: false,
  disconnectInfo: undefined,
  serverId: undefined,
  ownUserId: undefined,
  categories: [],
  channels: [],
  emojis: [],
  selectedChannelId: undefined,
  currentVoiceChannelId: undefined,
  messagesMap: {},
  users: [],
  roles: [],
  publicSettings: undefined,
  info: undefined,
  loadingInfo: false,
  typingMap: {},
  voiceMap: {},
  externalStreamsMap: {},
  ownVoiceState: {
    micMuted: false,
    soundMuted: false,
    webcamEnabled: false,
    sharingScreen: false
  },
  pinnedCard: undefined,
  channelPermissions: {},
  readStatesMap: {},
  pluginCommands: {}
};

export const serverSlice = createSlice({
  name: 'server',
  initialState,
  reducers: {
    resetState: (state) => {
      Object.assign(state, {
        ...initialState,
        info: state.info
      });
    },
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.connected = action.payload;
      state.connecting = false;
    },
    setConnecting: (state, action: PayloadAction<boolean>) => {
      state.connecting = action.payload;
    },
    setServerId: (state, action: PayloadAction<string | undefined>) => {
      state.serverId = action.payload;
    },
    setInfo: (state, action: PayloadAction<TServerInfo | undefined>) => {
      state.info = action.payload;
    },
    setLoadingInfo: (state, action: PayloadAction<boolean>) => {
      state.loadingInfo = action.payload;
    },
    setDisconnectInfo: (
      state,
      action: PayloadAction<TDisconnectInfo | undefined>
    ) => {
      state.disconnectInfo = action.payload;
    },
    setInitialData: (
      state,
      action: PayloadAction<{
        serverId: string;
        categories: TCategory[];
        channels: TChannel[];
        users: TJoinedPublicUser[];
        ownUserId: number;
        roles: TJoinedRole[];
        emojis: TJoinedEmoji[];
        publicSettings: TPublicServerSettings | undefined;
        voiceMap: TVoiceMap;
        externalStreamsMap: TExternalStreamsMap;
        channelPermissions: TChannelUserPermissionsMap;
        readStates: TReadStateMap;
      }>
    ) => {
      state.connected = true;
      state.categories = action.payload.categories;
      state.channels = action.payload.channels;
      state.emojis = action.payload.emojis;
      state.users = action.payload.users;
      state.roles = action.payload.roles;
      state.ownUserId = action.payload.ownUserId;
      state.publicSettings = action.payload.publicSettings;
      state.voiceMap = action.payload.voiceMap;
      state.externalStreamsMap = action.payload.externalStreamsMap;
      state.serverId = action.payload.serverId;
      state.channelPermissions = action.payload.channelPermissions;
      state.readStatesMap = action.payload.readStates;
    },
    addMessages: (
      state,
      action: PayloadAction<{
        channelId: number;
        messages: TJoinedMessage[];
        opts?: { prepend?: boolean };
      }>
    ) => {
      const { channelId, messages, opts } = action.payload;
      const existing = state.messagesMap[channelId] ?? [];

      // dedupe: only add new IDs
      const existingIds = new Set(existing.map((m) => m.id));
      const filtered = messages.filter((m) => !existingIds.has(m.id));

      let merged: TJoinedMessage[];
      if (opts?.prepend) {
        merged = [...filtered, ...existing];
      } else {
        merged = [...existing, ...filtered];
      }

      // store in chronological asc order (oldest → newest)
      state.messagesMap[channelId] = merged.sort(
        (a, b) => a.createdAt - b.createdAt
      );
    },
    updateMessage: (
      state,
      action: PayloadAction<{ channelId: number; message: TJoinedMessage }>
    ) => {
      const messages = state.messagesMap[action.payload.channelId];

      if (!messages) return;

      const messageIndex = messages.findIndex(
        (message) => message.id === action.payload.message.id
      );

      if (messageIndex === -1) return;

      messages[messageIndex] = action.payload.message;
    },
    deleteMessage: (
      state,
      action: PayloadAction<{ channelId: number; messageId: number }>
    ) => {
      const messages = state.messagesMap[action.payload.channelId];

      if (!messages) return;

      state.messagesMap[action.payload.channelId] = messages.filter(
        (m) => m.id !== action.payload.messageId
      );
    },
    clearTypingUsers: (state, action: PayloadAction<number>) => {
      delete state.typingMap[action.payload];
    },
    addTypingUser: (
      state,
      action: PayloadAction<{ channelId: number; userId: number }>
    ) => {
      const { channelId, userId } = action.payload;
      const typingUsers = state.typingMap[channelId] || [];

      if (!typingUsers.includes(userId)) {
        typingUsers.push(userId);
        state.typingMap[channelId] = typingUsers;
      }
    },
    removeTypingUser: (
      state,
      action: PayloadAction<{ channelId: number; userId: number }>
    ) => {
      const { channelId, userId } = action.payload;
      const typingUsers = state.typingMap[channelId] || [];

      state.typingMap[channelId] = typingUsers.filter((id) => id !== userId);
    },

    // USERS ------------------------------------------------------------

    setUsers: (state, action: PayloadAction<TJoinedPublicUser[]>) => {
      state.users = action.payload;
    },
    updateUser: (
      state,
      action: PayloadAction<{
        userId: number;
        user: Partial<TJoinedPublicUser>;
      }>
    ) => {
      const index = state.users.findIndex(
        (u) => u.id === action.payload.userId
      );

      if (index === -1) return;

      state.users[index] = {
        ...state.users[index],
        ...action.payload.user
      };
    },
    addUser: (state, action: PayloadAction<TJoinedPublicUser>) => {
      const exists = state.users.find((u) => u.id === action.payload.id);

      if (exists) return;

      state.users.push(action.payload);
    },
    wipeUser: (state, action: PayloadAction<{ userId: number }>) => {
      const { userId } = action.payload;

      // remove user
      state.users = state.users.filter((u) => u.id !== userId);

      // remove user from typing states
      for (const channelId in state.typingMap) {
        state.typingMap[channelId] = state.typingMap[channelId].filter(
          (id) => id !== userId
        );
      }

      // remove user from voice channels
      for (const channelId in state.voiceMap) {
        delete state.voiceMap[channelId].users[userId];
      }

      // remove user from messages and reactions
      for (const channelId in state.messagesMap) {
        state.messagesMap[channelId] = state.messagesMap[channelId].filter(
          (m) => m.userId !== userId
        );
      }

      // remove user from emojis
      state.emojis = state.emojis.filter((e) => e.userId !== userId);
    },
    reassignUser: (
      state,
      action: PayloadAction<{ userId: number; deletedUserId: number }>
    ) => {
      const { userId, deletedUserId } = action.payload;

      // remove user
      state.users = state.users.filter((u) => u.id !== userId);

      // remove user from typing states
      for (const channelId in state.typingMap) {
        state.typingMap[channelId] = state.typingMap[channelId].filter(
          (id) => id !== userId
        );
      }

      // remove user from voice channels
      for (const channelId in state.voiceMap) {
        delete state.voiceMap[channelId].users[userId];
      }

      // reassign messages and reactions
      for (const channelId in state.messagesMap) {
        state.messagesMap[channelId] = state.messagesMap[channelId].map((m) =>
          m.userId === userId ? { ...m, userId: deletedUserId } : m
        );
      }

      // reassign emojis
      state.emojis = state.emojis.map((e) =>
        e.userId === userId ? { ...e, userId: deletedUserId } : e
      );
    },

    // SERVER SETTINGS ------------------------------------------------------------

    setPublicSettings: (
      state,
      action: PayloadAction<TPublicServerSettings | undefined>
    ) => {
      state.publicSettings = action.payload;
    },

    // ROLES ------------------------------------------------------------

    setRoles: (state, action: PayloadAction<TJoinedRole[]>) => {
      state.roles = action.payload;
    },
    updateRole: (
      state,
      action: PayloadAction<{
        roleId: number;
        role: Partial<TJoinedRole>;
      }>
    ) => {
      const index = state.roles.findIndex(
        (r) => r.id === action.payload.roleId
      );

      if (index === -1) return;

      state.roles[index] = {
        ...state.roles[index],
        ...action.payload.role
      };
    },
    addRole: (state, action: PayloadAction<TJoinedRole>) => {
      const exists = state.roles.find((r) => r.id === action.payload.id);

      if (exists) return;

      state.roles.push(action.payload);
    },
    removeRole: (state, action: PayloadAction<{ roleId: number }>) => {
      state.roles = state.roles.filter((r) => r.id !== action.payload.roleId);
    },

    // CHANNELS ------------------------------------------------------------

    setChannels: (state, action: PayloadAction<TChannel[]>) => {
      state.channels = action.payload;
    },
    updateChannel: (
      state,
      action: PayloadAction<{ channelId: number; channel: Partial<TChannel> }>
    ) => {
      const index = state.channels.findIndex(
        (c) => c.id === action.payload.channelId
      );

      if (index === -1) return;

      state.channels[index] = {
        ...state.channels[index],
        ...action.payload.channel
      };
    },
    addChannel: (state, action: PayloadAction<TChannel>) => {
      const exists = state.channels.find((c) => c.id === action.payload.id);

      if (exists) return;

      state.channels.push(action.payload);
    },
    removeChannel: (state, action: PayloadAction<{ channelId: number }>) => {
      state.channels = state.channels.filter(
        (c) => c.id !== action.payload.channelId
      );
    },
    setSelectedChannelId: (
      state,
      action: PayloadAction<number | undefined>
    ) => {
      state.selectedChannelId = action.payload;

      if (action.payload) {
        // reset unread count on select
        // for now this is good enough
        state.readStatesMap[action.payload] = 0;
      }
    },
    setCurrentVoiceChannelId: (
      state,
      action: PayloadAction<number | undefined>
    ) => {
      state.currentVoiceChannelId = action.payload;
    },
    setChannelPermissions: (
      state,
      action: PayloadAction<TChannelUserPermissionsMap>
    ) => {
      state.channelPermissions = action.payload;
    },
    setChannelReadState: (
      state,
      action: PayloadAction<{ channelId: number; count: number | undefined }>
    ) => {
      const { channelId, count } = action.payload;

      state.readStatesMap[channelId] = count;
    },

    // EMOJIS ------------------------------------------------------------

    setEmojis: (state, action: PayloadAction<TJoinedEmoji[]>) => {
      state.emojis = action.payload;
    },
    updateEmoji: (
      state,
      action: PayloadAction<{ emojiId: number; emoji: Partial<TJoinedEmoji> }>
    ) => {
      const index = state.emojis.findIndex(
        (e) => e.id === action.payload.emojiId
      );
      if (index === -1) return;
      state.emojis[index] = {
        ...state.emojis[index],
        ...action.payload.emoji
      };
    },
    addEmoji: (state, action: PayloadAction<TJoinedEmoji>) => {
      const exists = state.emojis.find((e) => e.id === action.payload.id);

      if (exists) return;
      state.emojis.push(action.payload);
    },
    removeEmoji: (state, action: PayloadAction<{ emojiId: number }>) => {
      state.emojis = state.emojis.filter(
        (e) => e.id !== action.payload.emojiId
      );
    },

    // CATEGORIES ------------------------------------------------------------

    setCategories: (state, action: PayloadAction<TCategory[]>) => {
      state.categories = action.payload;
    },
    addCategory: (state, action: PayloadAction<TCategory>) => {
      const exists = state.categories.find((c) => c.id === action.payload.id);

      if (exists) return;

      state.categories.push(action.payload);
    },
    updateCategory: (
      state,
      action: PayloadAction<{
        categoryId: number;
        category: Partial<TCategory>;
      }>
    ) => {
      const index = state.categories.findIndex(
        (c) => c.id === action.payload.categoryId
      );

      if (index === -1) return;

      state.categories[index] = {
        ...state.categories[index],
        ...action.payload.category
      };
    },
    removeCategory: (state, action: PayloadAction<{ categoryId: number }>) => {
      state.categories = state.categories.filter(
        (c) => c.id !== action.payload.categoryId
      );
    },

    // VOICE ------------------------------------------------------------

    addUserToVoiceChannel: (
      state,
      action: PayloadAction<{
        channelId: number;
        userId: number;
        state: TVoiceUserState;
      }>
    ) => {
      const { channelId, userId, state: userState } = action.payload;

      if (!state.voiceMap[channelId]) {
        state.voiceMap[channelId] = { users: {} };
      }

      state.voiceMap[channelId].users[userId] = userState;
    },
    removeUserFromVoiceChannel: (
      state,
      action: PayloadAction<{ channelId: number; userId: number }>
    ) => {
      const { channelId, userId } = action.payload;

      if (!state.voiceMap[channelId]) return;

      delete state.voiceMap[channelId].users[userId];
    },
    updateVoiceUserState: (
      state,
      action: PayloadAction<{
        channelId: number;
        userId: number;
        newState: Partial<TVoiceUserState>;
      }>
    ) => {
      const { channelId, userId, newState } = action.payload;

      if (!state.voiceMap[channelId]) return;
      if (!state.voiceMap[channelId].users[userId]) return;

      state.voiceMap[channelId].users[userId] = {
        ...state.voiceMap[channelId].users[userId],
        ...newState
      };
    },
    updateOwnVoiceState: (
      state,
      action: PayloadAction<Partial<TVoiceUserState>>
    ) => {
      state.ownVoiceState = {
        ...state.ownVoiceState,
        ...action.payload
      };
    },
    setPinnedCard: (state, action: PayloadAction<TPinnedCard | undefined>) => {
      state.pinnedCard = action.payload;
    },
    addExternalStreamToChannel: (
      state,
      action: PayloadAction<{
        channelId: number;
        streamId: number;
        stream: TExternalStream;
      }>
    ) => {
      const { channelId, streamId, stream } = action.payload;

      if (!state.externalStreamsMap[channelId]) {
        state.externalStreamsMap[channelId] = {};
      }

      state.externalStreamsMap[channelId][streamId] = stream;
    },
    updateExternalStreamInChannel: (
      state,
      action: PayloadAction<{
        channelId: number;
        streamId: number;
        stream: TExternalStream;
      }>
    ) => {
      const { channelId, streamId, stream } = action.payload;

      if (!state.externalStreamsMap[channelId]) return;
      if (!state.externalStreamsMap[channelId][streamId]) return;

      state.externalStreamsMap[channelId][streamId] = stream;
    },
    removeExternalStreamFromChannel: (
      state,
      action: PayloadAction<{ channelId: number; streamId: number }>
    ) => {
      const { channelId, streamId } = action.payload;

      if (!state.externalStreamsMap[channelId]) return;

      delete state.externalStreamsMap[channelId][streamId];
    },

    // PLUGINS ------------------------------------------------------------

    setPluginCommands: (state, action: PayloadAction<TCommandsMapByPlugin>) => {
      state.pluginCommands = action.payload;
    },
    addPluginCommand: (state, action: PayloadAction<TCommandInfo>) => {
      const { pluginId } = action.payload;

      if (!state.pluginCommands[pluginId]) {
        state.pluginCommands[pluginId] = [];
      }

      const exists = state.pluginCommands[pluginId].find(
        (c) => c.name === action.payload.name
      );

      if (exists) return;

      state.pluginCommands[pluginId].push(action.payload);
    },
    removePluginCommand: (
      state,
      action: PayloadAction<{ commandName: string }>
    ) => {
      const { commandName } = action.payload;

      for (const pluginId in state.pluginCommands) {
        state.pluginCommands[pluginId] = state.pluginCommands[pluginId].filter(
          (c) => c.name !== commandName
        );
      }
    }
  }
});

const serverSliceActions = serverSlice.actions;
const serverSliceReducer = serverSlice.reducer;

export { serverSliceActions, serverSliceReducer };
