import type { OidcError } from '@sharkord/shared';

class OidcCallbackError extends Error {
  constructor(
    readonly code: OidcError,
    message: string
  ) {
    super(message);
  }
}

export { OidcCallbackError };
