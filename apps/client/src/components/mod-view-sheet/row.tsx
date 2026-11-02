import { IconButton, Tooltip } from '@sharkord/ui';
import { Eye, EyeClosed, type LucideIcon } from 'lucide-react';
import { memo, useCallback, useState, type ReactNode } from 'react';

type TRowProps = {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  details?: string;
  hidden?: boolean;
};

const Row = memo(
  ({ icon: Icon, label, value, details, hidden = false }: TRowProps) => {
    const [visible, setVisible] = useState(!hidden);

    const onToggleVisible = useCallback(() => {
      setVisible((prev) => !prev);
    }, []);

    let valContent = (
      <span className="text-sm text-muted-foreground truncate max-w-[160px]">
        {visible ? value : '***'}
      </span>
    );

    if (details) {
      valContent = <Tooltip content={details}>{valContent}</Tooltip>;
    }

    return (
      <div className="flex items-center justify-between py-1.5 px-1 gap-4">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="text-sm truncate">{label}</span>
        </div>
        {valContent}
        {hidden && (
          <IconButton
            role="button"
            onClick={onToggleVisible}
            className="text-muted-foreground inline-flex h-6 w-6 items-center justify-center rounded bg-transparent hover:bg-accent hover:text-foreground cursor-pointer transition-colors focus:outline-none"
            icon={visible ? EyeClosed : Eye}
          />
        )}
      </div>
    );
  }
);

export { Row };
