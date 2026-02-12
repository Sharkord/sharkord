export enum ServerEvents {
  NEW_MESSAGE = "newMessage",
  MESSAGE_UPDATE = "messageUpdate",
  MESSAGE_DELETE = "messageDelete",
  MESSAGE_TYPING = "messageTyping",

  USER_JOIN = "userJoin",
  USER_LEAVE = "userLeave",

  CHANNEL_CREATE = "channelCreate",
  CHANNEL_UPDATE = "channelUpdate",
  CHANNEL_DELETE = "channelDelete",
  CHANNEL_PERMISSIONS_UPDATE = "channelPermissionsUpdate",
  CHANNEL_READ_STATES_UPDATE = "channelReadStatesUpdate",
  CHANNEL_READ_STATES_DELTA = "channelReadStatesDelta",

  USER_JOIN_VOICE = "userJoinVoice",
  USER_LEAVE_VOICE = "userLeaveVoice",
  USER_VOICE_STATE_UPDATE = "userVoiceStateUpdate",

  VOICE_ADD_EXTERNAL_STREAM = "voiceAddExternalStream",
  VOICE_UPDATE_EXTERNAL_STREAM = "voiceUpdateExternalStream",
  VOICE_REMOVE_EXTERNAL_STREAM = "voiceRemoveExternalStream",
  VOICE_NEW_PRODUCER = "voiceNewProducer",
  VOICE_PRODUCER_CLOSED = "voiceProducerClosed",

  EMOJI_CREATE = "emojiCreate",
  EMOJI_UPDATE = "emojiUpdate",
  EMOJI_DELETE = "emojiDelete",

  ROLE_CREATE = "roleCreate",
  ROLE_UPDATE = "roleUpdate",
  ROLE_DELETE = "roleDelete",

  USER_CREATE = "userCreate",
  USER_UPDATE = "userUpdate",
  USER_DELETE = "userDelete",

  SERVER_SETTINGS_UPDATE = "serverSettingsUpdate",

  PLUGIN_LOG = "pluginLog",
  PLUGIN_COMMANDS_CHANGE = "pluginCommandsChange",

  CATEGORY_CREATE = "categoryCreate",
  CATEGORY_UPDATE = "categoryUpdate",
  CATEGORY_DELETE = "categoryDelete",
}

export type TNewMessage = {
  content: string;
  channelId: number;
};
