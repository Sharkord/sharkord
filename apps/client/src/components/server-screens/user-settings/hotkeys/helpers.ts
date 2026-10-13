import type { THotkeyBinding } from '@/lib/hotkeys/types';

const bindingsToRecord = (bindings: THotkeyBinding[]) => {
  const record: Record<string, string> = {};

  const sorted = [...bindings].sort((a, b) =>
    a.actionId.localeCompare(b.actionId)
  );

  sorted.forEach(({ actionId, combo }) => {
    record[actionId] = combo;
  });

  return record;
};

const bindingsFromRecord = (record: Record<string, string>) => {
  const entries = Object.entries(record);

  return entries.map(([actionId, combo]) => ({ actionId, combo }));
};

export { bindingsFromRecord, bindingsToRecord };
