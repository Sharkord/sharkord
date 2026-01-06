import { HelpCircle } from 'lucide-react';
import { memo } from 'react';
import { Label } from './label';
import { Tooltip } from './tooltip';

type TGroupProps = {
  label: string;
  children: React.ReactNode;
  description?: string;
  help?: React.ReactNode;
};

const Group = memo(({ label, children, description, help }: TGroupProps) => {
  let helpComponent = null;

  if (help) {
    helpComponent = (
      <Tooltip content={help}>
        <HelpCircle className="ml-1 inline-block h-3 w-3 text-muted-foreground" />
      </Tooltip>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col">
        <div className="flex">
          <Label>{label}</Label>
          {helpComponent}
        </div>
        {description && (
          <span className="text-sm text-muted-foreground">{description}</span>
        )}
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
});
Group.displayName = 'Group';

export { Group };
