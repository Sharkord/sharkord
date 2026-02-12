import { i18n } from '@/i18n';

type TMapApiErrorParams = {
  code?: string;
  message?: string;
};

const TRPC_CODE_TO_KEY: Record<string, string> = {
  BAD_REQUEST: 'errors.codes.badRequest',
  UNAUTHORIZED: 'errors.codes.unauthorized',
  FORBIDDEN: 'errors.codes.forbidden',
  NOT_FOUND: 'errors.codes.notFound',
  METHOD_NOT_SUPPORTED: 'errors.codes.methodNotSupported',
  TIMEOUT: 'errors.codes.timeout',
  CONFLICT: 'errors.codes.conflict',
  PRECONDITION_FAILED: 'errors.codes.preconditionFailed',
  PAYLOAD_TOO_LARGE: 'errors.codes.payloadTooLarge',
  TOO_MANY_REQUESTS: 'errors.codes.tooManyRequests',
  INTERNAL_SERVER_ERROR: 'errors.codes.internalServerError'
};

const VALIDATION_CODE_TO_KEY: Record<string, string> = {
  invalid_type: 'errors.validation.invalidType',
  invalid_string: 'errors.validation.invalidString',
  invalid_enum_value: 'errors.validation.invalidEnumValue',
  invalid_literal: 'errors.validation.invalidLiteral',
  invalid_union: 'errors.validation.invalidUnion',
  too_small: 'errors.validation.tooSmall',
  too_big: 'errors.validation.tooBig',
  custom: 'errors.validation.custom'
};

const MESSAGE_TO_KEY: Record<string, string> = {
  'Invalid password': 'errors.auth.invalidPassword',
  'Invalid secret token': 'errors.auth.invalidSecretToken',
  'Invalid handshake hash': 'errors.auth.invalidHandshakeHash',
  'User not authenticated': 'errors.auth.userNotAuthenticated',
  'Channel not found': 'errors.channel.channelNotFound',
  'Channel is not a voice channel': 'errors.channel.channelNotVoice',
  'User already in a voice channel': 'errors.channel.userAlreadyInVoiceChannel',
  'User is not in a voice channel': 'errors.channel.userNotInVoiceChannel',
  'User not in voice channel': 'errors.channel.userNotInVoiceChannel',
  'Voice runtime not found for this channel':
    'errors.channel.voiceRuntimeNotFound',
  'Either userId or roleId must be provided':
    'errors.channel.permissionOverrideRequiresTarget',
  'Cannot specify both userId and roleId':
    'errors.channel.permissionOverrideSingleTarget',
  'User is not connected': 'errors.moderation.userNotConnected',
  'You cannot ban yourself.': 'errors.moderation.cannotBanSelf',
  'User already has this role': 'errors.moderation.userAlreadyHasRole',
  'User does not have this role': 'errors.moderation.userDoesNotHaveRole',
  'Role not found': 'errors.roles.roleNotFound',
  'Default role not found': 'errors.roles.defaultRoleNotFound',
  'Temporary file not found': 'errors.files.temporaryFileNotFound'
};

const getTranslatedKey = (key: string | undefined): string | undefined => {
  if (!key) {
    return undefined;
  }

  const translated = i18n.t(key);

  if (translated === key) {
    return undefined;
  }

  return translated;
};

const mapApiError = ({ code, message }: TMapApiErrorParams): string | undefined => {
  if (code) {
    const trpcCodeKey = getTranslatedKey(TRPC_CODE_TO_KEY[code.toUpperCase()]);

    if (trpcCodeKey) {
      return trpcCodeKey;
    }

    const validationKey = getTranslatedKey(
      VALIDATION_CODE_TO_KEY[code.toLowerCase()]
    );

    if (validationKey) {
      return validationKey;
    }
  }

  if (!message) {
    return undefined;
  }

  return getTranslatedKey(MESSAGE_TO_KEY[message.trim()]);
};

export { mapApiError };