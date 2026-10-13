import { Group } from '@sharkord/ui';
import { memo } from 'react';
import { HotkeyInput } from '.';

type THotkeyBindGroupProps = {
  actionId: string;
  label: string;
  description?: string;
};

const HotkeyBindGroup = memo(
  ({ actionId, label, description }: THotkeyBindGroupProps) => {
    return (
      <Group label={label} description={description}>
        <HotkeyInput actionId={actionId} />
      </Group>
    );
  }
);

export { HotkeyBindGroup };
