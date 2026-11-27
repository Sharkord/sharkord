import { memo, type ReactNode } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from './card';

type TSettingsSectionProps = {
  title: ReactNode;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

const SettingsSection = memo(
  ({
    title,
    description,
    action,
    children,
    className
  }: TSettingsSectionProps) => {
    return (
      <Card className={className}>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
            <div className="min-w-0 flex-1 basis-56">
              <CardTitle>{title}</CardTitle>
              {description && <CardDescription>{description}</CardDescription>}
            </div>
            {action && (
              <div className="flex shrink-0 items-center gap-1">{action}</div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">{children}</CardContent>
      </Card>
    );
  }
);

export { SettingsSection };
