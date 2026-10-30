import { DESKTOP_MISMATCHES, type TDesktopMismatch } from '@sharkord/shared';
import type { TServerStatus } from './types';

const isMismatchStatus = (status: TServerStatus): status is TDesktopMismatch =>
  (DESKTOP_MISMATCHES as readonly string[]).includes(status);

export { isMismatchStatus };
