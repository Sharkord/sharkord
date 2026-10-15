import type {
  ActionDefinition,
  CommandDefinition,
  TActionContract,
  TBeforeChannelCreateHook,
  TBeforeChannelDeleteHook,
  TBeforeFileSaveHook,
  TBeforeLoginHook,
  TBeforeMessageSaveHook,
  TBeforeProfileUpdateHook,
  TBeforeReactionHook,
  TBeforeVoiceJoinHook,
  TCategory,
  TChannel,
  TChannelState,
  TCommandArg,
  TCommandContract,
  TContractActions,
  TContractCommands,
  TContractPush,
  TContractUserData,
  TInvite,
  TInvokerContext,
  TJoinedEmoji,
  TJoinedMessage,
  TJoinedPublicUser,
  TJoinedRole,
  TPluginActions,
  TPluginComponentsMapBySlotId,
  TPluginContract,
  TPluginMessageComponent,
  TPluginMessageComponentProps,
  TPluginMessageComponentsMap,
  TPluginSettingDefinition,
  TPluginSlotProps,
  TPluginSlotRequirements,
  TPluginStore,
  TPluginStoreState,
  TPluginTab,
  TPluginTabs,
  TStreamQualityLayer,
  TVoiceProducerInfo,
  TVoiceUserState
} from '@sharkord/shared';
import {
  ChannelPermission,
  ChannelType,
  FileSaveType,
  MessageSaveType,
  Permission,
  PLUGIN_SDK_VERSION,
  PluginSlot,
  StreamKind
} from '@sharkord/shared';
import type { IncomingMessage, ServerResponse } from 'http';
import type { AppData, Producer, Router, RtpParameters } from 'mediasoup/types';

/** What to consume, and where its packets go. */
export type TConsumeOptions = {
  channelId: number;
  /** the producing user, from `getProducers` or `voice:producer_added` */
  userId: number;
  kind: StreamKind;
  /**
   * One RTP packet, header included. Called often: for audio roughly every
   * 20ms per speaker, so keep it to buffering and do the work elsewhere.
   */
  onRtp: (packet: Buffer) => void;
};

/**
 * A live consumer of someone's media. Close it when you are done, or it keeps
 * pulling packets until the producer ends or the plugin unloads.
 */
export type TVoiceConsumerHandle = {
  producerId: string;
  /**
   * What the packets are, which is what an SDP needs if you hand them to
   * ffmpeg later.
   */
  rtpParameters: RtpParameters;
  /** video only, and needed before the first frame is decodable */
  requestKeyFrame(): Promise<void>;
  close(): void;
};

/**
 * A stream the plugin produces into a voice channel, so it appears alongside
 * the people in it. The producers are yours to create from
 * `ctx.voice.getRouter()`.
 */
export type TCreateStreamOptions = {
  channelId: number;
  /** shown to viewers */
  title: string;
  /** your own id for the stream, so you can tell yours apart */
  key: string;
  avatarUrl?: string;
  bannerUrl?: string;
  producers: {
    audio?: Producer;
    video?: Producer;
  };
  videoLayers?: TStreamQualityLayer[];
};

/**
 * The live stream. Keep it: `remove` is what takes the stream down, and a
 * plugin that loses its handle leaves one playing until the runtime closes.
 */
export type TExternalStreamHandle = {
  streamId: number;
  remove: () => void;
  update: (options: {
    title?: string;
    avatarUrl?: string;
    bannerUrl?: string;
    producers?: {
      audio?: Producer;
      video?: Producer;
    };
    videoLayers?: TStreamQualityLayer[];
  }) => void;
};

/** the HTTP methods a plugin route can be registered for */
export type TPluginHttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'OPTIONS';

export type TPluginHttpRouteOptions = {
  auth?: boolean;
  requires?: Permission;
};

export type TPluginHttpRouteContext = {
  userId?: number;
};

export type TPluginHttpRouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  ctx: TPluginHttpRouteContext
) => Promise<unknown> | unknown;

/**
 * Everything a plugin can listen to with `ctx.events.on`. Each name's payload
 * is in `EventPayloads`, so the handler argument is typed from the name.
 */
export type ServerEvent =
  | 'user:joined'
  | 'user:left'
  | 'user:joined_voice'
  | 'user:left_voice'
  | 'message:created'
  | 'message:updated'
  | 'message:deleted'
  | 'voice:runtime_initialized'
  | 'voice:runtime_closed'
  | 'voice:producer_added'
  | 'voice:producer_removed'
  | 'voice:state_updated'
  | 'setting:set'
  | 'reaction:added'
  | 'reaction:removed'
  | 'message:pinned'
  | 'message:unpinned'
  | 'user:banned'
  | 'user:unbanned'
  | 'user:kicked'
  | 'user:created'
  | 'user:deleted'
  | 'role:assigned'
  | 'role:removed'
  | 'channel:created'
  | 'channel:updated'
  | 'channel:deleted'
  | 'category:created'
  | 'category:updated'
  | 'category:deleted'
  | 'role:created'
  | 'role:updated'
  | 'role:deleted'
  | 'user:updated'
  | 'invite:created'
  | 'invite:used'
  | 'emoji:created';

/** What each event hands its handler. */
export interface EventPayloads {
  'user:joined': {
    userId: number;
    username: string;
  };
  'user:left': {
    userId: number;
    username: string;
  };
  'user:joined_voice': {
    userId: number;
    channelId: number;
  };
  'user:left_voice': {
    userId: number;
    channelId: number;
  };
  /**
   * `parentMessageId` is set for a thread reply and `replyToMessageId` for an
   * inline reply. `fileIds` are the attachments, for `files.getPath`.
   */
  'message:created': {
    messageId: number;
    channelId: number;
    userId: number | null;
    pluginId: string | null;
    content: string;
    textContent: string;
    parentMessageId: number | null;
    replyToMessageId: number | null;
    fileIds: number[];
  };
  'message:updated': {
    messageId: number;
    channelId: number;
    userId: number | null;
    editedBy: number | null;
    pluginId: string | null;
    content: string;
    textContent: string;
  };
  'message:deleted': {
    messageId: number;
    channelId: number;
  };
  'reaction:added': {
    messageId: number;
    channelId: number;
    userId?: number;
    pluginId?: string;
    emoji: string;
  };
  'reaction:removed': {
    messageId: number;
    channelId: number;
    userId?: number;
    pluginId?: string;
    emoji: string;
  };
  'message:pinned': {
    messageId: number;
    channelId: number;
    userId?: number;
  };
  'message:unpinned': {
    messageId: number;
    channelId: number;
    userId?: number;
  };
  'user:banned': {
    userId: number;
    reason?: string;
    actorUserId?: number;
  };
  'user:unbanned': {
    userId: number;
    actorUserId?: number;
  };
  'user:kicked': {
    userId: number;
    reason?: string;
    actorUserId?: number;
  };
  'user:created': {
    userId: number;
    username: string;
  };
  'user:deleted': {
    userId: number;
  };
  'role:assigned': {
    userId: number;
    roleId: number;
  };
  'role:removed': {
    userId: number;
    roleId: number;
  };
  'channel:created': {
    channelId: number;
    name: string;
    type: string;
    categoryId: number | null;
  };
  'channel:updated': {
    channelId: number;
    name: string;
    type: string;
    categoryId: number | null;
  };
  'channel:deleted': {
    channelId: number;
    name: string;
  };
  'category:created': {
    categoryId: number;
    name: string;
  };
  'category:updated': {
    categoryId: number;
    name: string;
  };
  'category:deleted': {
    categoryId: number;
    name: string;
  };
  'role:created': {
    roleId: number;
    name: string;
  };
  'role:updated': {
    roleId: number;
    name: string;
  };
  'role:deleted': {
    roleId: number;
    name: string;
  };
  'user:updated': {
    userId: number;
    username: string;
  };
  'invite:created': {
    inviteId: number;
    code: string;
    creatorId: number;
    roleId: number | null;
  };
  /** someone registered with the invite, who is now `userId` */
  'invite:used': {
    code: string;
    userId: number;
  };
  'emoji:created': {
    emojiId: number;
    name: string;
    userId: number;
  };
  'voice:runtime_initialized': {
    channelId: number;
  };
  'voice:runtime_closed': {
    channelId: number;
  };
  /**
   * A user started sending audio, video or a screen. The producer is live from
   * here until `voice:producer_removed`, so this is where a recorder starts
   * consuming; for whoever was already producing, read `getProducers`.
   */
  'voice:producer_added': {
    channelId: number;
    userId: number;
    kind: StreamKind;
    producerId: string;
  };
  /** fires however the producer ended: stopped, disconnected or channel closed */
  'voice:producer_removed': {
    channelId: number;
    userId: number;
    kind: StreamKind;
    producerId: string;
  };
  /**
   * A user in the channel muted, deafened, or turned their camera or screen
   * share on or off. `state` is the whole state after the change.
   */
  'voice:state_updated': {
    channelId: number;
    userId: number;
    state: TVoiceUserState;
  };
  'setting:set': {
    key: string;
    value: unknown;
  };
}

// this API is probably going to change a lot in the future
// so consider it as experimental for now

type SettingValueType<T extends TPluginSettingDefinition> =
  T['type'] extends 'string'
    ? string
    : T['type'] extends 'number' | 'channel' | 'role'
      ? number
      : T['type'] extends 'boolean'
        ? boolean
        : unknown;

/**
 * Typed access to the settings you registered, keyed by their definitions. Pass
 * the definitions `as const` and both the keys and the value types follow.
 *
 * Reads are from memory and always return something, since a key that an admin
 * never saved falls back to its `defaultValue`.
 */
export interface PluginSettings<
  T extends readonly TPluginSettingDefinition[] = TPluginSettingDefinition[]
> {
  get<K extends T[number]['key']>(
    key: K
  ): SettingValueType<Extract<T[number], { key: K }>>;
  set<K extends T[number]['key']>(
    key: K,
    value: SettingValueType<Extract<T[number], { key: K }>>
  ): void;
}

/**
 * Everything the host hands a plugin, passed to `onLoad`.
 *
 * Pass the plugin's `TPluginContract` and the parts of the context it covers
 * are typed from it, names included:
 *
 * ```ts
 * type TSharkord = {
 *   actions: { roll: { payload: { sides: number }; response: number } };
 * };
 *
 * const onLoad = (ctx: PluginContext<TSharkord>) => { ... };
 * ```
 *
 * The contract is optional, and so is every key in it: what you leave out
 * behaves as it did before, with `unknown` payloads.
 *
 * Plugins run inside the server process. There is no sandbox, so nothing here
 * is a security boundary: it is the supported way to reach the host, not a
 * fence around it.
 */
export interface PluginContext<C extends TPluginContract = TPluginContract> {
  /**
   * This plugin's own folder. Read-only in practice: installing an update
   * deletes and rewrites it, so anything you write here is gone afterwards.
   * Use `dataPath` for anything you need to keep.
   */
  path: string;
  /**
   * A folder that survives updates and is removed with the plugin. The place
   * for caches, cursors, downloads, and anything else on disk.
   */
  dataPath: string;
  /** The id from your manifest. */
  pluginId: string;

  /**
   * Writes to the plugin's log, readable by anyone who can manage plugins.
   * Command arguments are deliberately never logged for you: some are marked
   * sensitive, so log them yourself only if you mean to.
   */
  logger: {
    log(...args: unknown[]): void;
    debug(...args: unknown[]): void;
    error(...args: unknown[]): void;
  };

  /** @deprecated use ctx.logger.log instead */
  log(...args: unknown[]): void;
  /** @deprecated use ctx.logger.debug instead */
  debug(...args: unknown[]): void;
  /** @deprecated use ctx.logger.error instead */
  error(...args: unknown[]): void;

  /**
   * Notifications about things that already happened. Handlers cannot change
   * or stop them: for that you want `hooks`, which run before the write.
   *
   * Every handler is unregistered when the plugin unloads, so `off` is only
   * needed to stop listening earlier. `on` returns the same unsubscribe.
   */
  events: {
    on<E extends ServerEvent>(
      event: E,
      handler: (payload: EventPayloads[E]) => void | Promise<void>
    ): () => void;
    off<E extends ServerEvent>(
      event: E,
      handler: (payload: EventPayloads[E]) => void | Promise<void>
    ): void;
  };

  /**
   * Functions the plugin's own UI can call, through
   * `store.actions.executePluginAction`. Unlike a command, an action is not
   * typed into chat and produces no message.
   *
   * The name has to be one of the contract's `actions` keys, and the payload
   * and return type of `executes` follow from it.
   */
  actions: {
    register<K extends keyof TContractActions<C> & string>(action: {
      name: K;
      description?: string;
      /**
       * The permission a user needs to call this action. Without it the action
       * is public; either way a server owner can override the access per role.
       */
      requires?: Permission;
      executes: (
        ctx: TInvokerContext,
        payload: TContractActions<C>[K]['payload']
      ) => Promise<TContractActions<C>[K]['response']>;
    }): void;
  };

  /**
   * The raw mediasoup layer behind voice channels. Unassisted on purpose: the
   * host hands over its own router rather than wrapping it, so anything
   * mediasoup can do is available and nothing is validated for you.
   */
  voice: {
    /** throws when the channel has no live voice runtime */
    getRouter(channelId: number): Router<AppData>;
    createStream(options: TCreateStreamOptions): TExternalStreamHandle;
    getListenInfo(): {
      ip: string;
      announcedAddress: string | undefined;
    };
    /** who is connected, what they have muted, and the plugin streams playing */
    getState(channelId: number): TChannelState;
    /**
     * Every live producer in the channel. A recorder that starts mid call has
     * to read this as well as listening for `voice:producer_added`, or it only
     * hears whoever unmutes after it started.
     */
    getProducers(channelId: number): TVoiceProducerInfo[];
    /**
     * Receives a user's media as RTP packets, in this process: no ports and no
     * external program. What arrives is exactly what the browser sent, so audio
     * is Opus at 48kHz and decoding it is yours to do.
     *
     * Pipe it to ffmpeg instead when you want a file: create a plain transport
     * from `getRouter()` and consume the same `producerId`, which is the path
     * that gets you decoding, resampling and muxing for free.
     *
     * The handle closes itself when the producer ends or the plugin unloads.
     */
    consume(options: TConsumeOptions): Promise<TVoiceConsumerHandle>;
    /**
     * Sends a user to another voice channel, as a moderator moving them would.
     * Their client makes the switch, so it lands a moment later, and they need
     * neither the JOIN permission nor sight of the channel: a move can pull
     * someone into a private channel, which is then revealed to them. Throws
     * when the user is not in a voice channel or already in that one.
     */
    move(userId: number, channelId: number): Promise<void>;
    /** Takes a user out of whatever voice channel they are in. */
    disconnect(userId: number): Promise<void>;
    /**
     * Mutes a user for everyone, the way a moderator would, or lifts it. Their
     * audio is stopped on the server, so a modified client cannot get around
     * it, and they cannot unmute themselves until it is lifted. It covers
     * every voice channel, so switching channels does not escape it, and it
     * can be set while the user is not in voice. It lasts until lifted or the
     * server restarts. Lifting it leaves them muted: they unmute themselves
     * when they are ready.
     */
    setServerMute(userId: number, muted: boolean): Promise<void>;
    /**
     * Floats an emoji on a user's card, the same animation as a reaction they
     * sent themselves, and indistinguishable from one. Takes a unicode emoji,
     * a shortcode or a custom emoji name. Throws when the user is not in the
     * channel or the emoji is unknown.
     */
    react(channelId: number, userId: number, emoji: string): Promise<void>;
  };

  /**
   * Messages the plugin sends are authored by the plugin, not by a user: they
   * render with your name and logo and a bot badge, and they are not editable
   * by anyone in the client.
   */
  messages: {
    /**
     * `content` is HTML and is sanitized before it is stored, so what you send
     * and what everyone sees can differ. A message carrying files may be empty.
     */
    send(
      channelId: number,
      content: string,
      options?: {
        parentMessageId?: number; // used for threads
        replyToMessageId?: number; // used for inline replies
        files?: { name: string; data: Uint8Array }[];
        /**
         * Whether the host looks up the links in the message. On by default.
         *
         * Turn it off and the message renders as written: no link cards, and
         * no inline image or video for a link that points at one. Worth doing
         * when the message is already formatted the way you want it, or when
         * you would rather the server not fetch the url at all.
         */
        previews?: boolean;
        /**
         * Components from your client bundle's `messageComponents`, rendered
         * after the message text, in this order. Each one is a `name` from that
         * export and the `props` it receives. Every client that can read the
         * message receives the props, so they are not a place for secrets. At
         * most 5 components and 16 KB.
         */
        components?: TPluginMessageComponent[];
      }
    ): Promise<{ messageId: number }>;
    /**
     * Any message, not only the plugin's own. An edit looks the links up
     * again, so pass `previews: false` here too or a message sent without
     * cards gets them back.
     */
    edit(
      messageId: number,
      content: string,
      options?: { previews?: boolean }
    ): Promise<void>;
    /**
     * Replaces the components of one of your own messages, or removes them
     * with `null`. Not an edit of what the message says, so it leaves no
     * "edited" mark: the way to update a poll's counts on every vote.
     */
    setComponents(
      messageId: number,
      components: TPluginMessageComponent[] | null
    ): Promise<void>;
    delete(messageId: number): Promise<void>;
    get(messageId: number): Promise<TJoinedMessage | undefined>;
    /** thread replies cannot be pinned */
    pin(messageId: number): Promise<void>;
    unpin(messageId: number): Promise<void>;
    /**
     * Reacts as the plugin rather than on a user's behalf, so it sits beside a
     * user's identical emoji as its own reaction. Reacting twice with the same
     * emoji does nothing.
     */
    react(messageId: number, emoji: string): Promise<void>;
    unreact(messageId: number, emoji: string): Promise<void>;
    /**
     * Newest first. `before` is a message id to page backwards from, so a
     * second call passes the last id it received.
     */
    list(options: {
      channelId: number;
      limit?: number;
      before?: number;
      parentMessageId?: number;
    }): Promise<TJoinedMessage[]>;
  };

  /**
   * Slash commands users type into chat. The invocation and its answer render
   * as a chip in the channel, so the response is public.
   *
   * The name has to be one of the contract's `commands` keys, and the args and
   * return type of `executes` follow from it. `args` describes the fields users
   * fill in; it is the UI side of the same shape.
   */
  commands: {
    register<K extends keyof TContractCommands<C> & string>(command: {
      name: K;
      description?: string;
      args?: TCommandArg[];
      /**
       * The permission a user needs to run this command. Without it the command
       * is public; either way a server owner can override the access per role.
       */
      requires?: Permission;
      /**
       * Answers only the user who ran it, with nothing stored in the channel.
       * For help, errors and confirmations everyone else does not need to see.
       */
      ephemeral?: boolean;
      executes: (
        ctx: TInvokerContext,
        args: TContractCommands<C>[K]['args']
      ) => Promise<TContractCommands<C>[K]['response']>;
    }): void;
  };

  /**
   * Server-wide configuration, edited by admins in the plugin's settings tab.
   * Not per user: see `userData` for that.
   *
   * The returned object is typed from the definitions you pass, so
   * `settings.get('apiKey')` knows its own type. Register once in `onLoad`.
   */
  settings: {
    register<T extends readonly TPluginSettingDefinition[]>(
      definitions: T
    ): Promise<PluginSettings<T>>;
  };

  /**
   * Run **before** the host writes, and can change or refuse what happens.
   * Every hook answers the same three ways: return nothing to allow, return
   * `{ update }` to change it, return `{ reject: 'reason' }` to refuse with a
   * message the user sees.
   *
   * Throwing is not the way to refuse: it means the plugin is broken, so it is
   * logged, the user gets a generic error, and the operation fails closed.
   * Hooks from several plugins run in order and the first refusal wins.
   */
  hooks: {
    onBeforeFileSave(handler: TBeforeFileSaveHook): void;
    onBeforeMessageSave(handler: TBeforeMessageSaveHook): void;
    onBeforeChannelCreate(handler: TBeforeChannelCreateHook): void;
    onBeforeVoiceJoin(handler: TBeforeVoiceJoinHook): void;
    onBeforeLogin(handler: TBeforeLoginHook): void;
    onBeforeReaction(handler: TBeforeReactionHook): void;
    onBeforeProfileUpdate(handler: TBeforeProfileUpdateHook): void;
    onBeforeChannelDelete(handler: TBeforeChannelDeleteHook): void;
  };

  /**
   * HTTP routes served under `/plugins/<pluginId>`, so `get('/hello')` answers
   * at `/plugins/my-plugin/hello`.
   *
   * The handler gets node's raw request and response: body parsing, route
   * params and content types are yours to do. A route is public unless its
   * options say otherwise, because a webhook receiver has to be.
   *
   * Every plugin route shares one rate limit.
   */
  http: {
    register(
      method: TPluginHttpMethod,
      path: string,
      handler: TPluginHttpRouteHandler,
      options?: TPluginHttpRouteOptions
    ): void;
    get(
      path: string,
      handler: TPluginHttpRouteHandler,
      options?: TPluginHttpRouteOptions
    ): void;
    post(
      path: string,
      handler: TPluginHttpRouteHandler,
      options?: TPluginHttpRouteOptions
    ): void;
    patch(
      path: string,
      handler: TPluginHttpRouteHandler,
      options?: TPluginHttpRouteOptions
    ): void;
    delete(
      path: string,
      handler: TPluginHttpRouteHandler,
      options?: TPluginHttpRouteOptions
    ): void;
    options(
      path: string,
      handler: TPluginHttpRouteHandler,
      options?: TPluginHttpRouteOptions
    ): void;
  };

  /**
   * The host's own answer about what a user may do, including role inheritance,
   * channel overrides and the owner short circuit. Ask rather than reading
   * roles and deciding yourself, which drifts the moment the rules change.
   */
  permissions: {
    userCan(userId: number, permission: Permission): Promise<boolean>;
    userCanInChannel(
      userId: number,
      channelId: number,
      permission: ChannelPermission
    ): Promise<boolean>;
  };

  /**
   * Roles and their membership. Plugins may never touch the owner role or the
   * roles of anyone who holds it.
   */
  roles: {
    list(): Promise<TJoinedRole[]>;
    get(roleId: number): Promise<TJoinedRole | undefined>;
    /**
     * White unless `color` says otherwise, and with no permissions unless
     * `permissions` grants some. A server holds at most 100 roles.
     */
    create(input: {
      name: string;
      color?: string;
      permissions?: Permission[];
    }): Promise<TJoinedRole>;
    /** `permissions` replaces the role's whole list, it does not add to it */
    update(
      roleId: number,
      values: { name?: string; color?: string; permissions?: Permission[] }
    ): Promise<TJoinedRole>;
    assign(userId: number, roleId: number): Promise<void>;
    remove(userId: number, roleId: number): Promise<void>;
  };

  /**
   * Sends data to the plugin's client code, received with `usePush` or
   * `actions.onPush`. Addressed on the server: a user who is not a recipient
   * never receives it.
   */
  push: {
    toUser(userId: number, data: TContractPush<C>): void;
    toUsers(userIds: number[], data: TContractPush<C>): void;
    toAll(data: TContractPush<C>): void;
    /**
     * Everyone connected to the voice channel right now. Reaches nobody when
     * the channel is empty, rather than throwing like the `voice` methods.
     */
    toVoiceChannel(channelId: number, data: TContractPush<C>): void;
  };

  /**
   * Server-wide key value storage, owned by the plugin and removed with it. The
   * place for polls, reminders, counters and anything else that is not about
   * one user. Values are JSON, so anything `JSON.stringify` keeps survives.
   *
   * Keep keys structured (`poll:42`, `reminder:1700000000:7`) so `list` can
   * read one kind back by its prefix.
   */
  storage: {
    get<T = unknown>(key: string): Promise<T | undefined>;
    set(key: string, value: unknown): Promise<void>;
    delete(key: string): Promise<void>;
    /**
     * Ordered by key. `limit` defaults to 100, and `after` is the last key of
     * the previous page, so a second call passes the last key it received.
     */
    list(options?: {
      prefix?: string;
      limit?: number;
      after?: string;
    }): Promise<{ key: string; value: unknown }[]>;
  };

  userData: {
    get(userId: number): Promise<TContractUserData<C>>;
    set(userId: number, data: TContractUserData<C>): Promise<void>;
    delete(userId: number): Promise<void>;
  };

  users: {
    list(): Promise<TJoinedPublicUser[]>;
    get(userId: number): Promise<TJoinedPublicUser | undefined>;
    ban(userId: number, reason?: string): Promise<void>;
    unban(userId: number): Promise<void>;
    kick(userId: number, reason?: string): Promise<void>;
  };

  channels: {
    list(): Promise<TChannel[]>;
    get(channelId: number): Promise<TChannel | undefined>;
    create(input: {
      name: string;
      type: ChannelType;
      categoryId: number;
      private?: boolean;
    }): Promise<TChannel>;
    update(
      channelId: number,
      values: { name?: string; topic?: string | null; private?: boolean }
    ): Promise<void>;
    delete(channelId: number): Promise<void>;
    /**
     * Puts `channelIds` in that order at the top of the category. A channel
     * from another category is moved into it, and the ones you leave out keep
     * their order after yours.
     */
    reorder(categoryId: number, channelIds: number[]): Promise<void>;
  };

  /**
   * Invites are attributed to a user, `creatorId`, since every invite has one:
   * usually whoever asked the plugin for it.
   */
  invites: {
    /**
     * `maxUses` 0 means unlimited, and `code` is random unless you pick one.
     * `roleId` is given to whoever registers with it, and cannot be the owner
     * role.
     */
    create(input: {
      creatorId: number;
      code?: string;
      maxUses?: number;
      expiresAt?: number | null;
      roleId?: number;
    }): Promise<TInvite>;
  };

  /**
   * Custom emojis. Like invites, one is attributed to a user, `userId`, usually
   * whoever asked the plugin to add it.
   */
  emojis: {
    /**
     * `fileName` is what the image is called, and its extension has to be an
     * image's. A taken `name` gets a number added, so read the returned name.
     */
    create(input: {
      name: string;
      fileName: string;
      data: Uint8Array;
      userId: number;
    }): Promise<TJoinedEmoji>;
    delete(emojiId: number): Promise<void>;
  };

  /**
   * Files the server stores: message attachments, emojis, avatars. A message
   * from `messages.get` lists its attachments in `files`, and their ids are
   * what this takes.
   */
  files: {
    /**
     * Where the file lives on disk, or `undefined` for an id that does not
     * exist. Read it with `fs`, or hand the path to ffmpeg.
     *
     * The file is the host's: never write to it, and copy it into `dataPath`
     * if you need it to outlive the message, since deleting the message
     * deletes the file.
     */
    getPath(fileId: number): Promise<string | undefined>;
  };

  /** Categories are what a channel needs to be created in. */
  categories: {
    list(): Promise<TCategory[]>;
    get(categoryId: number): Promise<TCategory | undefined>;
    create(name: string): Promise<TCategory>;
    update(categoryId: number, name: string): Promise<void>;
    delete(categoryId: number): Promise<void>;
  };

  ui: {
    enable(requirements?: TPluginSlotRequirements): void;
    disable(): void;
  };
}

/**
 * A smaller context for `onUnload`. Registering anything at this point would
 * only be torn down a moment later, so the registration namespaces are absent.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface UnloadPluginContext extends Pick<
  PluginContext,
  | 'path'
  | 'dataPath'
  | 'logger'
  | 'log'
  | 'debug'
  | 'error'
  | 'voice'
  | 'messages'
  | 'storage'
  | 'ui'
> {}

/** The versions an upgrade is moving between, both from your manifest. */
export type TUpgradeInfo = {
  previousVersion: string;
  version: string;
};

/**
 * The context for `onUpgrade`. Nothing is registered and no plugin is loaded
 * yet, so this is the filesystem and the logger only: enough to migrate what
 * lives in `dataPath`.
 */
export type UpgradePluginContext = Pick<
  PluginContext,
  'pluginId' | 'path' | 'dataPath' | 'logger' | 'log' | 'debug' | 'error'
>;

/**
 * What a plugin's `server/index.js` exports.
 *
 * ```ts
 * const onLoad = (ctx) => {
 *   ctx.commands.register({
 *     name: 'ping',
 *     async executes() {
 *       return { message: 'pong' };
 *     }
 *   });
 * };
 *
 * export { onLoad };
 * ```
 */
export type PluginModule<C extends TPluginContract = TPluginContract> = {
  /**
   * Called once when the plugin loads, and again after every enable or update.
   * Register everything here: commands, actions, hooks, routes, settings, UI.
   *
   * Throwing stops the load and the reason is shown to admins.
   */
  onLoad: (ctx: PluginContext<C>) => void | Promise<void>;
  /**
   * Called when the plugin is disabled, updated, removed, or the server stops.
   * Commands, hooks, routes and event handlers are unregistered for you: this
   * is for what the host cannot see, such as timers, sockets and file handles.
   *
   * A leaked timer survives a reload and fires against the next load.
   */
  onUnload?: (ctx: UnloadPluginContext) => void | Promise<void>;
  /**
   * Called when the installed version differs from the last one that ran,
   * **before** `onLoad`. The place to migrate anything under `dataPath`.
   *
   * Throwing stops the load and leaves the recorded version alone, so a half
   * migrated plugin does not start and the upgrade is retried next time.
   */
  onUpgrade?: (
    ctx: UpgradePluginContext,
    info: TUpgradeInfo
  ) => void | Promise<void>;
};

type TSharkordState = ReturnType<TPluginStore['getState']>;

// re-export mediasoup types for plugin usage
export type {
  AppData,
  MediaKind,
  PlainTransport,
  PlainTransportOptions,
  Producer,
  ProducerOptions,
  Router,
  RtpCodecCapability,
  RtpEncodingParameters,
  RtpParameters,
  Transport
} from 'mediasoup/types';

export type {
  ActionDefinition,
  CommandDefinition,
  TActionContract,
  TBeforeChannelCreateHook,
  TBeforeChannelDeleteHook,
  TBeforeFileSaveHook,
  TBeforeLoginHook,
  TBeforeMessageSaveHook,
  TBeforeProfileUpdateHook,
  TBeforeReactionHook,
  TBeforeVoiceJoinHook,
  TCategory,
  TChannel,
  TCommandArg,
  TCommandContract,
  TInvokerContext,
  TPluginActions,
  TPluginComponentsMapBySlotId,
  TPluginContract,
  TPluginMessageComponent,
  TPluginMessageComponentProps,
  TPluginMessageComponentsMap,
  TPluginSlotProps,
  TPluginSlotRequirements,
  TPluginStore,
  TPluginStoreState,
  TPluginTab,
  TPluginTabs,
  TSharkordState
};

export * from './actions';
export {
  ChannelPermission,
  ChannelType,
  FileSaveType,
  MessageSaveType,
  Permission,
  PLUGIN_SDK_VERSION,
  PluginSlot
};
