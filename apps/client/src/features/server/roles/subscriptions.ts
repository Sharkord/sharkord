import { logDebug } from '@/helpers/browser-logger';
import { getTRPCClient } from '@/lib/trpc';
import type { TJoinedRole } from '@sharkord/shared';
import { handleSubscriptionError } from '../subscription-error';
import { addRole, removeRole, updateRole } from './actions';

const subscribeToRoles = () => {
  const trpc = getTRPCClient();

  const onRoleCreateSub = trpc.roles.onCreate.subscribe(undefined, {
    onData: (role: TJoinedRole) => {
      logDebug('[EVENTS] roles.onCreate', { role });
      addRole(role);
    },
    onError: handleSubscriptionError('onRoleCreate')
  });

  const onRoleDeleteSub = trpc.roles.onDelete.subscribe(undefined, {
    onData: (roleId: number) => {
      logDebug('[EVENTS] roles.onDelete', { roleId });
      removeRole(roleId);
    },
    onError: handleSubscriptionError('onRoleDelete')
  });

  const onRoleUpdateSub = trpc.roles.onUpdate.subscribe(undefined, {
    onData: (role: TJoinedRole) => {
      logDebug('[EVENTS] roles.onUpdate', { role });
      updateRole(role.id, role);
    },
    onError: handleSubscriptionError('onRoleUpdate')
  });

  return () => {
    onRoleCreateSub.unsubscribe();
    onRoleDeleteSub.unsubscribe();
    onRoleUpdateSub.unsubscribe();
  };
};

export { subscribeToRoles };
