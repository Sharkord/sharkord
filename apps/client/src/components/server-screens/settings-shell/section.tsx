import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@sharkord/ui';
import { memo, type ReactNode } from 'react';

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
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
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
