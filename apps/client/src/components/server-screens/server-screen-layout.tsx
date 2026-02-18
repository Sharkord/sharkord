import { ChevronLeft } from 'lucide-react';
import { memo } from 'react';
import { Button } from '@sharkord/ui';

type TServerScreenLayoutProps = {
  close: () => void;
  title: string;
  children: React.ReactNode;
};

const ServerScreenLayout = memo(
  ({ close, title, children }: TServerScreenLayoutProps) => {
    return (
      <div className="flex h-screen flex-col bg-background text-foreground dark">
        <div className="flex h-14 items-center gap-4 border-b border-border px-6">
          <Button variant="ghost" size="icon" onClick={close}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">{title}</h1>
        </div>

        <div className="flex-1 overflow-auto p-6">{children}</div>
      </div>
    );
  }
);

export { ServerScreenLayout };
