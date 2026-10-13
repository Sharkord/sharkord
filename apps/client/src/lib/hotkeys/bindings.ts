import type { THotkeyAction, THotkeyBinding } from './types';

const findBindingOwner = (
  bindings: THotkeyBinding[],
  actions: THotkeyAction[],
  actionId: string,
  combo: string
) => {
  const owner = bindings.find(
    (bind) =>
      bind.combo === combo &&
      bind.actionId !== actionId &&
      actions.some((action) => action.id === bind.actionId)
  );

  if (!owner) {
    return undefined;
  }

  return actions.find((action) => action.id === owner.actionId);
};

const findConflictLabel = (
  bindings: THotkeyBinding[],
  actions: THotkeyAction[],
  actionId: string,
  combo: string
) => {
  const owner = findBindingOwner(bindings, actions, actionId, combo);

  return owner ? owner.label : undefined;
};

export { findBindingOwner, findConflictLabel };
