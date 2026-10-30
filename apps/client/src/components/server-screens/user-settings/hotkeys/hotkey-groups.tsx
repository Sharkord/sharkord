import { ControlledHotkeyInput } from '@/components/hotkey-input/controlled-hotkey-input';
import { SettingsSection } from '@/components/server-screens/settings-shell/section';
import { usePluginNames } from '@/features/server/plugins/hooks';
import { useHotkeyState } from '@/hooks/use-hotkeys';
import { getHotkeyActionGroup, HotkeyGroup } from '@/lib/hotkeys/actions';
import { findConflictLabel } from '@/lib/hotkeys/bindings';
import type { THotkeyAction } from '@/lib/hotkeys/types';
import { Group } from '@sharkord/ui';
import { memo, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { bindingsFromRecord } from './helpers';
import type { THotkeysOnChange, THotkeysValues } from './types';

type THotkeyRowProps = {
  action: THotkeyAction;
  value?: string;
  error?: string;
  onBindChange: (actionId: string, combo?: string) => void;
  findConflict: (actionId: string, combo: string) => string | undefined;
};

const HotkeyRow = memo(
  ({ action, value, error, onBindChange, findConflict }: THotkeyRowProps) => {
    const handleChange = useCallback(
      (combo?: string) => onBindChange(action.id, combo),
      [onBindChange, action.id]
    );

    const handleConflict = useCallback(
      (combo: string) => findConflict(action.id, combo),
      [findConflict, action.id]
    );

    return (
      <Group label={action.label}>
        <ControlledHotkeyInput
          value={value}
          error={error}
          onChange={handleChange}
          findConflict={handleConflict}
        />
      </Group>
    );
  }
);

type THotkeyGroupsProps = {
  values: THotkeysValues;
  onChange: THotkeysOnChange;
};

const HotkeyGroups = memo(({ values, onChange }: THotkeyGroupsProps) => {
  const { t } = useTranslation('settings');
  const { actions, errors } = useHotkeyState();
  const pluginNames = usePluginNames();
  const { bindings } = values;

  // core first, then plugins in the order they registered
  const groups = useMemo(() => {
    const map = new Map<string, THotkeyAction[]>([[HotkeyGroup.CORE, []]]);

    actions.forEach((action) => {
      const group = getHotkeyActionGroup(action.id);
      const list = map.get(group) ?? [];

      list.push(action);
      map.set(group, list);
    });

    return [...map.entries()].filter(([, list]) => list.length > 0);
  }, [actions]);

  // checked against what is typed in the form, not what was saved before
  const findConflict = useCallback(
    (actionId: string, combo: string) =>
      findConflictLabel(bindingsFromRecord(bindings), actions, actionId, combo),
    [bindings, actions]
  );

  const handleBindChange = useCallback(
    (actionId: string, combo?: string) => {
      const { [actionId]: _removed, ...rest } = bindings;

      onChange('bindings', combo ? { ...rest, [actionId]: combo } : rest);
    },
    [bindings, onChange]
  );

  return (
    <>
      {groups.map(([group, list]) => (
        <SettingsSection
          key={group}
          title={
            group === HotkeyGroup.CORE
              ? t('hotkeysGroupCore')
              : (pluginNames[group] ?? group)
          }
        >
          {list.map((action) => (
            <HotkeyRow
              key={action.id}
              action={action}
              value={bindings[action.id]}
              error={errors[action.id]}
              onBindChange={handleBindChange}
              findConflict={findConflict}
            />
          ))}
        </SettingsSection>
      ))}
    </>
  );
});

export { HotkeyGroups };
