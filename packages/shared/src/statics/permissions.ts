export enum Permission {
  SEND_MESSAGES = 'SEND_MESSAGES',
  REACT_TO_MESSAGES = 'REACT_TO_MESSAGES',
  UPLOAD_FILES = 'UPLOAD_FILES',
  JOIN_VOICE_CHANNELS = 'JOIN_VOICE_CHANNELS',
  SHARE_SCREEN = 'SHARE_SCREEN',
  ENABLE_WEBCAM = 'ENABLE_WEBCAM',
  // ADMIN PERMISSIONS
  MANAGE_CHANNELS = 'MANAGE_CHANNELS',
  MANAGE_CHANNEL_PERMISSIONS = 'MANAGE_CHANNEL_PERMISSIONS',
  MANAGE_CATEGORIES = 'MANAGE_CATEGORIES',
  MANAGE_ROLES = 'MANAGE_ROLES',
  MANAGE_EMOJIS = 'MANAGE_EMOJIS',
  MANAGE_SETTINGS = 'MANAGE_SETTINGS',
  MANAGE_USERS = 'MANAGE_USERS',
  MANAGE_MESSAGES = 'MANAGE_MESSAGES',
  MANAGE_STORAGE = 'MANAGE_STORAGE',
  MANAGE_INVITES = 'MANAGE_INVITES',
  MANAGE_UPDATES = 'MANAGE_UPDATES',
  MANAGE_PLUGINS = 'MANAGE_PLUGINS',
  EXECUTE_PLUGIN_COMMANDS = 'EXECUTE_PLUGIN_COMMANDS'
}

export const permissionLabels: Record<Permission, string> = {
  [Permission.SEND_MESSAGES]: 'Send messages',
  [Permission.REACT_TO_MESSAGES]: 'React to messages',
  [Permission.UPLOAD_FILES]: 'Upload files',
  [Permission.JOIN_VOICE_CHANNELS]: 'Join voice channels',
  [Permission.SHARE_SCREEN]: 'Share screen',
  [Permission.ENABLE_WEBCAM]: 'Enable webcam',
  [Permission.MANAGE_CHANNELS]: 'Manage channels',
  [Permission.MANAGE_CHANNEL_PERMISSIONS]: 'Manage channel permissions',
  [Permission.MANAGE_CATEGORIES]: 'Manage categories',
  [Permission.MANAGE_ROLES]: 'Manage roles',
  [Permission.MANAGE_EMOJIS]: 'Manage emojis',
  [Permission.MANAGE_SETTINGS]: 'Manage server settings',
  [Permission.MANAGE_USERS]: 'Manage users',
  [Permission.MANAGE_MESSAGES]: 'Manage messages',
  [Permission.MANAGE_STORAGE]: 'Manage storage',
  [Permission.MANAGE_INVITES]: 'Manage invites',
  [Permission.MANAGE_UPDATES]: 'Manage updates',
  [Permission.MANAGE_PLUGINS]: 'Manage plugins',
  [Permission.EXECUTE_PLUGIN_COMMANDS]: 'Execute plugin commands'
};

export const permissionDescriptions: Record<Permission, string> = {
  [Permission.SEND_MESSAGES]:
    'Grants the ability to send messages in channels.',
  [Permission.REACT_TO_MESSAGES]: 'Grants the ability to react to messages.',
  [Permission.UPLOAD_FILES]: 'Grants the ability to upload files in channels.',
  [Permission.JOIN_VOICE_CHANNELS]:
    'Grants the ability to join voice channels.',
  [Permission.SHARE_SCREEN]: 'Grants the ability to share the screen.',
  [Permission.ENABLE_WEBCAM]: 'Grants the ability to enable the webcam.',
  [Permission.MANAGE_CHANNELS]:
    'Grants the ability to create, update, and delete channels.',
  [Permission.MANAGE_CHANNEL_PERMISSIONS]:
    'Grants the ability to manage channel-specific permissions for roles and users.',
  [Permission.MANAGE_CATEGORIES]:
    'Grants the ability to create, update, and delete categories.',
  [Permission.MANAGE_ROLES]:
    'Grants the ability to create, update, and delete roles.',
  [Permission.MANAGE_EMOJIS]:
    'Grants the ability to create, update, and delete emojis.',
  [Permission.MANAGE_SETTINGS]: 'Grants the ability to manage server settings.',
  [Permission.MANAGE_USERS]: 'Grants the ability to manage users.',
  [Permission.MANAGE_MESSAGES]:
    'Grants the ability to manage messages from all users by editing or deleting them.',
  [Permission.MANAGE_STORAGE]:
    'Grants the ability to manage storage, such as enabling or disabling uploads.',
  [Permission.MANAGE_INVITES]:
    'Grants the ability to create, edit, and delete server invites.',
  [Permission.MANAGE_UPDATES]: 'Grants the ability to perform updates.',
  [Permission.MANAGE_PLUGINS]: 'Grants the ability to manage plugins.',
  [Permission.EXECUTE_PLUGIN_COMMANDS]:
    'Grants the ability to execute plugin commands.'
};

export const DEFAULT_ROLE_PERMISSIONS = [
  Permission.JOIN_VOICE_CHANNELS,
  Permission.SEND_MESSAGES,
  Permission.UPLOAD_FILES,
  Permission.SHARE_SCREEN,
  Permission.ENABLE_WEBCAM
];

export enum UploadHeaders {
  ORIGINAL_NAME = 'x-file-name',
  TYPE = 'x-file-type',
  CONTENT_LENGTH = 'content-length',
  TOKEN = 'x-token'
}

export enum ChannelPermission {
  VIEW_CHANNEL = 'VIEW_CHANNEL',
  SEND_MESSAGES = 'SEND_MESSAGES',
  JOIN = 'JOIN',
  SPEAK = 'SPEAK',
  SHARE_SCREEN = 'SHARE_SCREEN',
  WEBCAM = 'WEBCAM'
}

export const channelPermissionLabels: Record<ChannelPermission, string> = {
  [ChannelPermission.VIEW_CHANNEL]: 'View Channel',
  [ChannelPermission.SEND_MESSAGES]: 'Send Messages',
  [ChannelPermission.JOIN]: 'Join Channel',
  [ChannelPermission.SPEAK]: 'Speak',
  [ChannelPermission.SHARE_SCREEN]: 'Share Screen',
  [ChannelPermission.WEBCAM]: 'Enable Webcam'
};

export const channelPermissionDescriptions: Record<ChannelPermission, string> =
  {
    [ChannelPermission.VIEW_CHANNEL]: 'Allows the user to view the channel.',
    [ChannelPermission.SEND_MESSAGES]: 'Allows the user to send messages.',
    [ChannelPermission.JOIN]: 'Allows the user to join the channel.',
    [ChannelPermission.SPEAK]: 'Allows the user to speak in voice channels.',
    [ChannelPermission.SHARE_SCREEN]: 'Allows the user to share their screen.',
    [ChannelPermission.WEBCAM]: 'Allows the user to enable their webcam.'
  };
