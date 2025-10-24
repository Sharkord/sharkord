import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  TCategory,
  TChannel,
  TJoinedEmoji,
  TJoinedMessage,
  TJoinedPublicUser,
  TJoinedRole,
  TPublicServerSettings,
  TServerInfo,
  TUser
} from '@sharkord/shared';
import type { TMessagesMap } from './types';

export interface IServerState {
  connected: boolean;
  connecting: boolean;
  serverId?: string;
  categories: TCategory[];
  channels: TChannel[];
  emojis: TJoinedEmoji[];
  selectedChannelId: number | undefined;
  messagesMap: TMessagesMap;
  users: TJoinedPublicUser[];
  ownUser?: TUser;
  roles: TJoinedRole[];
  publicSettings: TPublicServerSettings | undefined;
  info: TServerInfo | undefined;
  loadingInfo: boolean;
}

const initialState: IServerState = {
  connected: false,
  connecting: false,
  serverId: undefined,
  categories: [],
  channels: [],
  emojis: [],
  selectedChannelId: undefined,
  messagesMap: {},
  users: [],
  ownUser: undefined,
  roles: [],
  publicSettings: undefined,
  info: undefined,
  loadingInfo: false
};

export const serverSlice = createSlice({
  name: 'server',
  initialState,
  reducers: {
    resetState: () => initialState,
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
    setCategories: (state, action: PayloadAction<TCategory[]>) => {
      state.categories = action.payload;
    },
    setInfo: (state, action: PayloadAction<TServerInfo | undefined>) => {
      state.info = action.payload;
    },
    setLoadingInfo: (state, action: PayloadAction<boolean>) => {
      state.loadingInfo = action.payload;
    },
    setOwnUser: (state, action: PayloadAction<TUser | undefined>) => {
      state.ownUser = action.payload;
    },
    updateOwnUser: (state, action: PayloadAction<Partial<TUser>>) => {
      if (!state.ownUser) return;

      state.ownUser = {
        ...state.ownUser,
        ...action.payload
      };
    },
    setInitialData: (
      state,
      action: PayloadAction<{
        serverId: string;
        categories: TCategory[];
        channels: TChannel[];
        users: TJoinedPublicUser[];
        ownUser: TUser;
        roles: TJoinedRole[];
        emojis: TJoinedEmoji[];
        publicSettings: TPublicServerSettings | undefined;
      }>
    ) => {
      state.connected = true;
      state.categories = action.payload.categories;
      state.channels = action.payload.channels;
      state.emojis = action.payload.emojis;
      state.users = action.payload.users;
      state.ownUser = action.payload.ownUser;
      state.roles = action.payload.roles;
      state.publicSettings = action.payload.publicSettings;
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
    }
  }
});

const serverSliceActions = serverSlice.actions;
const serverSliceReducer = serverSlice.reducer;

export { serverSliceActions, serverSliceReducer };
