import type { TPinnedCard } from '@/components/channel-view/voice/hooks/use-pin-card-controller';
import { getLocalStorageItemBool, LocalStorageKey } from '@/helpers/storage';
import type { TConversation, TConversationKey } from '@/types';
import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type {
  TCategory,
  TChannel,
  TChannelUserPermissionsMap,
  TCommandsMapByPlugin,
  TDirectMessageConversation,
  TExternalStream,
  TExternalStreamsMap,
  TFollowedThread,
  TFollowedThreadsMap,
  TJoinedEmoji,
  TJoinedMessage,
  TJoinedPublicUser,
  TJoinedRole,
  TMessagesCursor,
  TPluginCapabilityAccessRule,
  TPluginComponentsMap,
  TPluginMessageComponentsByPlugin,
  TPluginMetadata,
  TPluginTab,
  TPluginTabsMap,
  TPublicServerSettings,
  TReadStateMap,
  TServerInfo,
  TThreadFollowUpdate,
  TThreadReadState,
  TThreadSummary,
  TVoiceMap,
  TVoiceUserState
} from '@sharkord/shared';
import { DEFAULT_MESSAGES_LIMIT } from '@sharkord/shared';
import {
  getConversationKey,
  mergeMessagesChronologically,
  upsertDirectMessage,
  upsertFollowedThread
} from './helpers';
import type {
  TDisconnectInfo,
  TMessagesMap,
  TReconnectState,
  TVoiceReaction
} from './types';
import { MAX_VOICE_REACTIONS_PER_USER } from './voice/statics';

export interface IServerState {
  connected: boolean;
  connecting: boolean;
  reconnect: TReconnectState | null;
  disconnectInfo?: TDisconnectInfo;
  serverId?: string;
  categories: TCategory[];
  channels: TChannel[];
  emojis: TJoinedEmoji[];
  ownUserId: number | undefined;
  ownUserPasswordSet: boolean;
  selectedChannelId: number | undefined;
  currentVoiceChannelId: number | undefined;
  // it lives here rather than in the subscription because joining the new room needs the voice provider context
  voiceMoveTargetChannelId: number | undefined;
  messagesMap: TMessagesMap;
  detachedConversations: { [conversationKey: string]: boolean };
  users: TJoinedPublicUser[];
  roles: TJoinedRole[];
  publicSettings: TPublicServerSettings | undefined;
  info: TServerInfo | undefined;
  loadingInfo: boolean;
  typingMap: {
    [conversationKey: string]: number[];
  };
  voiceMap: TVoiceMap;
  voiceReactions: {
    [userId: number]: TVoiceReaction[];
  };
  externalStreamsMap: TExternalStreamsMap;
  ownVoiceState: TVoiceUserState;
  pinnedCard: TPinnedCard | undefined;
  channelPermissions: TChannelUserPermissionsMap;
  readStatesMap: {
    [channelId: number]: number | undefined;
  };
  followedThreads: TFollowedThreadsMap;
  followedThreadsList: TFollowedThread[];
  followedThreadsCursor: TMessagesCursor | null;
  directMessages: TDirectMessageConversation[];
  pluginsMetadata: TPluginMetadata[];
  pluginCommands: TCommandsMapByPlugin;
  hideNonVideoParticipants: boolean;
  showUserBannersInVoice: boolean;
  hideOwnScreenShare: boolean;
  alwaysShowVoiceControls: boolean;
  pluginComponents: TPluginComponentsMap;
  pluginMessageComponents: TPluginMessageComponentsByPlugin;
  pluginTabs: TPluginTabsMap;
  pluginCapabilityAccess: TPluginCapabilityAccessRule[];
  activeFullscreenPluginId: string | undefined;
  dmsOpen: boolean;
  threadsOpen: boolean;
}

const initialState: IServerState = {
  connected: false,
  connecting: false,
  reconnect: null,
  disconnectInfo: undefined,
  serverId: undefined,
  ownUserId: undefined,
  ownUserPasswordSet: true,
  categories: [],
  channels: [],
  emojis: [],
  selectedChannelId: undefined,
  currentVoiceChannelId: undefined,
  voiceMoveTargetChannelId: undefined,
  messagesMap: {},
  detachedConversations: {},
  users: [],
  roles: [],
  publicSettings: undefined,
  info: undefined,
  loadingInfo: false,
  typingMap: {},
  voiceMap: {},
  voiceReactions: {},
  externalStreamsMap: {},
  ownVoiceState: {
    micMuted: false,
    soundMuted: false,
    webcamEnabled: false,
    sharingScreen: false,
    serverMuted: false
  },
  pinnedCard: undefined,
  channelPermissions: {},
  readStatesMap: {},
  followedThreads: {},
  followedThreadsList: [],
  followedThreadsCursor: null,
  directMessages: [],
  pluginsMetadata: [],
  pluginCommands: {},
  hideNonVideoParticipants: getLocalStorageItemBool(
    LocalStorageKey.HIDE_NON_VIDEO_PARTICIPANTS,
    false
  ),
  showUserBannersInVoice: getLocalStorageItemBool(
    LocalStorageKey.VOICE_CHAT_SHOW_USER_BANNERS,
    true
  ),
  alwaysShowVoiceControls: getLocalStorageItemBool(
    LocalStorageKey.ALWAYS_SHOW_VOICE_CONTROLS,
    true
  ),
  pluginComponents: {},
  pluginMessageComponents: {},
  pluginTabs: {},
  pluginCapabilityAccess: [],
  activeFullscreenPluginId: undefined,
  dmsOpen: false,
  threadsOpen: false,
  hideOwnScreenShare: getLocalStorageItemBool(
    LocalStorageKey.HIDE_OWN_SCREEN_SHARE,
    false
  )
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
    setReconnect: (state, action: PayloadAction<TReconnectState | null>) => {
      state.reconnect = action.payload;
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
        ownUserPasswordSet: boolean;
        roles: TJoinedRole[];
        emojis: TJoinedEmoji[];
        publicSettings: TPublicServerSettings | undefined;
        voiceMap: TVoiceMap;
        externalStreamsMap: TExternalStreamsMap;
        channelPermissions: TChannelUserPermissionsMap;
        readStates: TReadStateMap;
        followedThreads: TFollowedThreadsMap;
        directMessages: TDirectMessageConversation[];
        pluginsMetadata: TPluginMetadata[];
      }>
    ) => {
      state.connected = true;
      state.reconnect = null;
      state.categories = action.payload.categories;
      state.channels = action.payload.channels;
      state.emojis = action.payload.emojis;
      state.users = action.payload.users;
      state.roles = action.payload.roles;
      state.ownUserId = action.payload.ownUserId;
      state.ownUserPasswordSet = action.payload.ownUserPasswordSet;
      state.publicSettings = action.payload.publicSettings;
      state.voiceMap = action.payload.voiceMap;
      state.externalStreamsMap = action.payload.externalStreamsMap;
      state.serverId = action.payload.serverId;
      state.channelPermissions = action.payload.channelPermissions;
      state.readStatesMap = action.payload.readStates;
      state.followedThreads = action.payload.followedThreads;
      state.directMessages = action.payload.directMessages;
      state.pluginsMetadata = action.payload.pluginsMetadata;
    },
    addMessages: (
      state,
      action: PayloadAction<{
        conversationKey: TConversationKey;
        messages: TJoinedMessage[];
        isLive?: boolean;
      }>
    ) => {
      const { conversationKey, messages, isLive } = action.payload;

      // a detached conversation shows a window that stops short of the present, so appending a
      // live message would put the very gap this window exists to avoid back into the list. it
      // arrives with the rest when the user returns to the present
      if (isLive && state.detachedConversations[conversationKey]) return;

      const existing = state.messagesMap[conversationKey] ?? [];

      // dedupe against the incoming batch rather than the loaded history: the
      // set is the size of what just arrived, usually one message, instead of
      // every message the channel has scrolled into memory
      const incomingIds = new Set(messages.map((m) => m.id));

      for (const message of existing) {
        incomingIds.delete(message.id);

        if (incomingIds.size === 0) break;
      }

      const filtered =
        incomingIds.size === messages.length
          ? messages
          : messages.filter((m) => incomingIds.has(m.id));

      state.messagesMap[conversationKey] = mergeMessagesChronologically(
        existing,
        filtered
      );
    },
    updateMessage: (
      state,
      action: PayloadAction<{
        conversationKey: TConversationKey;
        message: TJoinedMessage;
      }>
    ) => {
      const messages = state.messagesMap[action.payload.conversationKey];

      if (!messages) return;

      const messageIndex = messages.findIndex(
        (message) => message.id === action.payload.message.id
      );

      if (messageIndex === -1) return;

      messages[messageIndex] = action.payload.message;
    },
    updateThreadSummary: (
      state,
      action: PayloadAction<
        TThreadSummary & {
          channelId: number;
          messageId: number;
        }
      >
    ) => {
      const messages =
        state.messagesMap[
          getConversationKey({ channelId: action.payload.channelId })
        ];

      if (!messages) return;

      const message = messages.find((m) => m.id === action.payload.messageId);

      if (!message) return;

      message.replyCount = action.payload.replyCount;
      message.replyUserIds = action.payload.replyUserIds;
    },
    deleteMessage: (
      state,
      action: PayloadAction<{
        conversation: TConversation;
        messageId: number;
      }>
    ) => {
      const { conversation, messageId } = action.payload;
      const conversationKey = getConversationKey(conversation);

      // a deleted parent takes its thread with it: the server cascades the replies and the
      // followers away, nothing will update these entries again
      delete state.messagesMap[
        getConversationKey({
          channelId: conversation.channelId,
          parentMessageId: messageId
        })
      ];
      delete state.followedThreads[messageId];
      state.followedThreadsList = upsertFollowedThread(
        state.followedThreadsList,
        messageId,
        null,
        false
      );

      const messages = state.messagesMap[conversationKey];

      if (!messages) return;

      const remaining = messages.filter((m) => m.id !== messageId);

      remaining.forEach((message) => {
        if (message.replyToMessageId === messageId) {
          message.replyToMessageId = null;
          message.replyTo = null;
        }
      });

      state.messagesMap[conversationKey] = remaining;
    },

    // used by the jump-to-message path when the window it fetched does not reach the newest
    // message. merging a bounded window into what the channel already holds would leave a gap
    // in the middle of the rendered list with nothing telling the user
    setConversationMessages: (
      state,
      action: PayloadAction<{
        conversationKey: TConversationKey;
        messages: TJoinedMessage[];
        detached: boolean;
      }>
    ) => {
      const { conversationKey, messages, detached } = action.payload;

      state.messagesMap[conversationKey] = messages;

      if (detached) {
        state.detachedConversations[conversationKey] = true;
      } else {
        delete state.detachedConversations[conversationKey];
      }
    },

    trimConversationMessages: (
      state,
      action: PayloadAction<TConversationKey>
    ) => {
      const conversationKey = action.payload;

      // a detached window is dropped outright rather than trimmed: keeping its newest page
      // would leave the conversation holding a slice of old history that the next mount's
      // page-1 fetch would merge into, reopening the gap
      if (state.detachedConversations[conversationKey]) {
        delete state.messagesMap[conversationKey];
        delete state.detachedConversations[conversationKey];

        return;
      }

      const messages = state.messagesMap[conversationKey];

      if (!messages || messages.length <= DEFAULT_MESSAGES_LIMIT) return;

      state.messagesMap[conversationKey] = messages.slice(
        -DEFAULT_MESSAGES_LIMIT
      );
    },

    addTypingUser: (
      state,
      action: PayloadAction<{
        conversationKey: TConversationKey;
        userId: number;
      }>
    ) => {
      const { conversationKey, userId } = action.payload;
      const typingUsers = state.typingMap[conversationKey] || [];

      if (!typingUsers.includes(userId)) {
        typingUsers.push(userId);
        state.typingMap[conversationKey] = typingUsers;
      }
    },
    removeTypingUser: (
      state,
      action: PayloadAction<{
        conversationKey: TConversationKey;
        userId: number;
      }>
    ) => {
      const { conversationKey, userId } = action.payload;
      const typingUsers = state.typingMap[conversationKey] || [];

      state.typingMap[conversationKey] = typingUsers.filter(
        (id) => id !== userId
      );
    },

    // USERS ------------------------------------------------------------

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
        state.messagesMap[channelId] = state.messagesMap[channelId]
          .filter((m) => m.userId !== userId)
          .map((m) => ({
            ...m,
            reactions: m.reactions.filter(
              (reaction) => reaction.userId !== userId
            )
          }));
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
        state.messagesMap[channelId] = state.messagesMap[channelId].map(
          (m) => ({
            ...m,
            userId: m.userId === userId ? deletedUserId : m.userId,
            reactions: m.reactions.map((reaction) =>
              reaction.userId === userId
                ? { ...reaction, userId: deletedUserId }
                : reaction
            )
          })
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
      state.directMessages = state.directMessages.filter(
        (dm) => dm.channelId !== action.payload.channelId
      );
    },
    setSelectedChannelId: (
      state,
      action: PayloadAction<number | undefined>
    ) => {
      state.selectedChannelId = action.payload;

      if (action.payload) {
        state.activeFullscreenPluginId = undefined;
        state.threadsOpen = false;
      }
    },
    setCurrentVoiceChannelId: (
      state,
      action: PayloadAction<number | undefined>
    ) => {
      state.currentVoiceChannelId = action.payload;
    },
    setVoiceMoveTargetChannelId: (
      state,
      action: PayloadAction<number | undefined>
    ) => {
      state.voiceMoveTargetChannelId = action.payload;
    },
    setChannelPermissions: (
      state,
      action: PayloadAction<TChannelUserPermissionsMap>
    ) => {
      state.channelPermissions = action.payload;
    },
    applyThreadFollowUpdate: (
      state,
      action: PayloadAction<TThreadFollowUpdate>
    ) => {
      const { parentMessageId, unreadCount, hasUnreadMention, thread } =
        action.payload;

      if (thread) {
        state.followedThreads[parentMessageId] = {
          unreadCount,
          hasUnreadMention
        };
      } else {
        delete state.followedThreads[parentMessageId];
      }

      state.followedThreadsList = upsertFollowedThread(
        state.followedThreadsList,
        parentMessageId,
        thread,
        state.followedThreadsCursor !== null
      );
    },
    setThreadReadState: (
      state,
      action: PayloadAction<TThreadReadState & { parentMessageId: number }>
    ) => {
      const { parentMessageId, unreadCount, hasUnreadMention } = action.payload;

      if (!(parentMessageId in state.followedThreads)) return;

      state.followedThreads[parentMessageId] = {
        unreadCount,
        hasUnreadMention
      };
    },
    setFollowedThreadsPage: (
      state,
      action: PayloadAction<{
        threads: TFollowedThread[];
        nextCursor: TMessagesCursor | null;
        append: boolean;
      }>
    ) => {
      const { threads, nextCursor, append } = action.payload;

      if (append) {
        const loadedIds = new Set(
          state.followedThreadsList.map((thread) => thread.parentMessageId)
        );

        state.followedThreadsList.push(
          ...threads.filter((thread) => !loadedIds.has(thread.parentMessageId))
        );
      } else {
        state.followedThreadsList = threads;
      }

      state.followedThreadsCursor = nextCursor;
    },
    setChannelReadState: (
      state,
      action: PayloadAction<{ channelId: number; count: number | undefined }>
    ) => {
      const { channelId, count } = action.payload;

      state.readStatesMap[channelId] = count;
    },

    // EMOJIS ------------------------------------------------------------

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
    addVoiceReaction: (
      state,
      action: PayloadAction<{ userId: number; reaction: TVoiceReaction }>
    ) => {
      const { userId, reaction } = action.payload;
      const reactions = state.voiceReactions[userId];

      if (!reactions) {
        state.voiceReactions[userId] = [reaction];

        return;
      }

      reactions.push(reaction);

      if (reactions.length > MAX_VOICE_REACTIONS_PER_USER) reactions.shift();
    },
    removeVoiceReaction: (
      state,
      action: PayloadAction<{ userId: number; reactionId: number }>
    ) => {
      const { userId, reactionId } = action.payload;
      const reactions = state.voiceReactions[userId];

      if (!reactions) return;

      const remaining = reactions.filter(({ id }) => id !== reactionId);

      if (!remaining.length) {
        delete state.voiceReactions[userId];

        return;
      }

      state.voiceReactions[userId] = remaining;
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
    setHideNonVideoParticipants: (state, action: PayloadAction<boolean>) => {
      state.hideNonVideoParticipants = action.payload;
    },
    setShowUserBannersInVoice: (state, action: PayloadAction<boolean>) => {
      state.showUserBannersInVoice = action.payload;
    },
    setHideOwnScreenShare: (state, action: PayloadAction<boolean>) => {
      state.hideOwnScreenShare = action.payload;
    },
    setAlwaysShowVoiceControls: (state, action: PayloadAction<boolean>) => {
      state.alwaysShowVoiceControls = action.payload;
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

    setPluginsMetadata: (state, action: PayloadAction<TPluginMetadata[]>) => {
      state.pluginsMetadata = action.payload;
    },
    setPluginCommands: (state, action: PayloadAction<TCommandsMapByPlugin>) => {
      state.pluginCommands = action.payload;
    },
    setPluginCapabilityAccess: (
      state,
      action: { payload: TPluginCapabilityAccessRule[] }
    ) => {
      state.pluginCapabilityAccess = action.payload;
    },
    setPluginTabs: (state, action: { payload: TPluginTabsMap }) => {
      state.pluginTabs = action.payload;
    },
    setPluginTabsForPlugin: (
      state,
      action: { payload: { pluginId: string; tabs: TPluginTab[] } }
    ) => {
      state.pluginTabs[action.payload.pluginId] = action.payload.tabs;
    },
    setPluginComponents: (
      state,
      action: PayloadAction<TPluginComponentsMap>
    ) => {
      state.pluginComponents = action.payload;
    },
    setPluginMessageComponents: (
      state,
      action: PayloadAction<TPluginMessageComponentsByPlugin>
    ) => {
      state.pluginMessageComponents = action.payload;
    },
    setActiveFullscreenPluginId: (
      state,
      action: PayloadAction<string | undefined>
    ) => {
      state.activeFullscreenPluginId = action.payload;

      if (action.payload) {
        state.selectedChannelId = undefined;
        state.dmsOpen = false;
      }
    },

    // OTHERS ------------------------------------------------------------

    upsertDirectMessage: (
      state,
      action: PayloadAction<TDirectMessageConversation>
    ) => {
      state.directMessages = upsertDirectMessage(
        state.directMessages,
        action.payload
      );
    },
    // only moves a conversation the list already has, a dm channel that is not in it yet
    // arrives through its own open event
    setDirectMessageActivity: (
      state,
      action: PayloadAction<{ channelId: number; lastMessageAt: number }>
    ) => {
      const { channelId, lastMessageAt } = action.payload;
      const conversation = state.directMessages.find(
        (dm) => dm.channelId === channelId
      );

      if (!conversation || conversation.lastMessageAt >= lastMessageAt) return;

      state.directMessages = upsertDirectMessage(state.directMessages, {
        ...conversation,
        lastMessageAt
      });
    },
    setThreadsOpen: (state, action: PayloadAction<boolean>) => {
      state.threadsOpen = action.payload;
    },
    setDmsOpen: (state, action: PayloadAction<boolean>) => {
      state.dmsOpen = action.payload;

      if (action.payload) {
        state.selectedChannelId = undefined;
        state.activeFullscreenPluginId = undefined;
        state.threadsOpen = false;
      }
    }
  }
});

const serverSliceActions = serverSlice.actions;
const serverSliceReducer = serverSlice.reducer;

export { serverSliceActions, serverSliceReducer };
