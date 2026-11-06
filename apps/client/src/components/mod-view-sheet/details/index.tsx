import { Protect } from '@/components/protect';
import { useDateLocale } from '@/hooks/use-date-locale';
import { Permission } from '@sharkord/shared/src/statics/permissions';
import { Card, CardContent, CardHeader, CardTitle } from '@sharkord/ui';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Calendar,
  ClipboardList,
  Clock,
  Gavel,
  Globe,
  IdCard,
  KeyRound,
  Network
} from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useModViewContext } from '../context';
import { Row } from '../row';

const Details = memo(() => {
  const { t } = useTranslation('settings');
  const dateLocale = useDateLocale();
  const { user, logins } = useModViewContext();
  const lastLogin = logins[0]; // TODO: in the future we might show a list of logins, atm we just show info about the last one

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          {t('detailsTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="space-y-2">
          <Row icon={IdCard} label={t('userIdLabel')} value={user.id} />

          <Protect permission={Permission.VIEW_USER_SENSITIVE_DATA}>
            <Row
              icon={IdCard}
              label={t('identityDetailLabel')}
              value={user.identity ?? ''}
              hidden
            />

            <Row
              icon={Network}
              label={t('ipAddressLabel')}
              value={lastLogin?.ip || t('unknownValue')}
              hidden
            />

            <Row
              icon={Globe}
              label={t('locationLabel')}
              value={`${lastLogin?.country || t('naValue')} - ${lastLogin?.city || t('naValue')}`}
              hidden
            />
          </Protect>

          <Row
            icon={KeyRound}
            label={t('accountSourceLabel')}
            value={
              user.isOidcUser
                ? t('accountSourceOidc')
                : t('accountSourcePassword')
            }
          />

          <Row
            icon={Calendar}
            label={t('joinedServerLabel')}
            value={formatDistanceToNow(user.createdAt, {
              addSuffix: true,
              locale: dateLocale
            })}
          />

          <Row
            icon={Clock}
            label={t('lastActiveLabel')}
            value={formatDistanceToNow(user.lastLoginAt, {
              addSuffix: true,
              locale: dateLocale
            })}
          />

          {user.banned && (
            <>
              <Row
                icon={Gavel}
                label={t('bannedDetailLabel')}
                value={t('bannedDetailValue')}
              />

              <Row
                icon={Gavel}
                label={t('banReasonLabel')}
                value={user.banReason || t('noReasonProvidedDetail')}
              />

              <Row
                icon={Gavel}
                label={t('bannedAtLabel')}
                value={format(user.bannedAt ?? 0, 'PPP', {
                  locale: dateLocale
                })}
                details={format(user.bannedAt ?? 0, 'PPpp', {
                  locale: dateLocale
                })}
              />
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
});

export { Details };
