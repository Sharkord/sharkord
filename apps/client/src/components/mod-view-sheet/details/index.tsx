import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  IconButton,
  Tooltip
} from '@sharkord/ui';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Calendar,
  ClipboardList,
  Clock,
  Eye,
  EyeClosed,
  Gavel,
  Globe,
  IdCard,
  Network
} from 'lucide-react';
import { memo, useState } from 'react';
import { useModViewContext } from '../context';
import { Protect } from '@/components/protect';
import { Permission } from '@sharkord/shared/src/statics/permissions';

type TRowProps = {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  details?: string;
  hidden?: boolean;
};

const Row = memo(({ icon, label, value, details, hidden = false }: TRowProps) => {
  let valContent = (
    <span className="text-sm text-muted-foreground truncate max-w-[160px]">
      {value}
    </span>
  );
  
  let [visible, setVisible] = useState(!hidden);

  if (details) {
    valContent = <Tooltip content={details}>{valContent}</Tooltip>;
  }

  return (
    <div className="flex items-center justify-between py-1.5 px-1 gap-4">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {icon}
        <span className="text-sm truncate">{label}</span>
      </div>
      {visible ? valContent : "***"}
      {hidden && (
        <IconButton
          role="button"
          onClick={() => setVisible(!visible)}
          className="text-muted-foreground inline-flex h-6 w-6 items-center justify-center rounded bg-transparent hover:bg-accent hover:text-foreground cursor-pointer transition-colors focus:outline-none"
          icon={visible ? EyeClosed : Eye}
        />
      )}
    </div>
  );
});

const Details = memo(() => {
  const { user, logins } = useModViewContext();
  const lastLogin = logins[0]; // TODO: in the future we might show a list of logins, atm we just show info about the last one

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="space-y-2">
          <Row
            icon={<IdCard className="h-4 w-4 text-muted-foreground" />}
            label="User ID"
            value={user.id}
          />

          <Protect permission={Permission.VIEW_USER_SENSITIVE_DATA}>
            <Row
              icon={<IdCard className="h-4 w-4 text-muted-foreground" />}
              label="Identity"
              value={user.identity}
              hidden={true}
            />

            <Row
              icon={<Network className="h-4 w-4 text-muted-foreground" />}
              label="IP Address"
              value={lastLogin?.ip || 'Unknown'}
              hidden={true}
            />

            <Row
              icon={<Globe className="h-4 w-4 text-muted-foreground" />}
              label="Location"
              value={`${lastLogin?.country || 'N/A'} - ${lastLogin?.city || 'N/A'}`}
              hidden={true}
            />
          </Protect>

          <Row
            icon={<Calendar className="h-4 w-4 text-muted-foreground" />}
            label="Joined Server"
            value={formatDistanceToNow(user.createdAt, { addSuffix: true })}
          />

          <Row
            icon={<Clock className="h-4 w-4 text-muted-foreground" />}
            label="Last Active"
            value={formatDistanceToNow(user.lastLoginAt, { addSuffix: true })}
          />

          {user.banned && (
            <>
              <Row
                icon={<Gavel className="h-4 w-4 text-muted-foreground" />}
                label="Banned"
                value="Yes"
              />

              <Row
                icon={<Gavel className="h-4 w-4 text-muted-foreground" />}
                label="Ban Reason"
                value={user.banReason || 'No reason provided'}
              />

              <Row
                icon={<Gavel className="h-4 w-4 text-muted-foreground" />}
                label="Banned At"
                value={format(user.bannedAt ?? 0, 'PPP')}
                details={format(user.bannedAt ?? 0, 'PPpp')}
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export { Details };
