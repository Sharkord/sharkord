import type { IRootState } from '@/features/store';
import { createCachedSelector } from 're-reselect';

export const rolesSelector = (state: IRootState) => state.server.roles;

export const roleByIdSelector = createCachedSelector(
  [rolesSelector, (_: IRootState, roleId: number) => roleId],
  (roles, roleId) => roles.find((role) => role.id === roleId)
)((_, roleId: number) => roleId);
