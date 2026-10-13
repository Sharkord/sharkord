import type { THotkeyAction, THotkeyBinding } from './types';

const findBindingOwner = (
  bindings: THotkeyBinding[],
  actionId: string,
  combo: string
) =>
  bindings.find((bind) => bind.combo === combo && bind.actionId !== actionId);

const findConflictLabel = (
  bindings: THotkeyBinding[],
  actions: THotkeyAction[],
  actionId: string,
  combo: string
) => {
  const owner = findBindingOwner(bindings, actionId, combo);

  if (!owner) {
    return undefined;
  }

  const action = actions.find(({ id }) => id === owner.actionId);

  return action ? action.label : owner.actionId;
};

export { findBindingOwner, findConflictLabel };
