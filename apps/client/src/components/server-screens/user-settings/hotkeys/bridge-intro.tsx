import { Button } from '@sharkord/ui';
import {
  AppWindow,
  ExternalLink,
  EyeOff,
  Zap,
  type LucideIcon
} from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const HOTKEYS_DOCS_URL = 'https://sharkord.com/docs/bridge/overview';

type TStep = {
  icon: LucideIcon;
  title: string;
  description: string;
};

const IntroStep = memo(({ icon: Icon, title, description }: TStep) => {
  return (
    <li className="flex gap-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </li>
  );
});

const BridgeIntro = memo(() => {
  const { t } = useTranslation('settings');

  return (
    <div className="space-y-4">
      <ol className="space-y-4">
        <IntroStep
          icon={EyeOff}
          title={t('hotkeysIntroProblemTitle')}
          description={t('hotkeysIntroProblemDesc')}
        />
        <IntroStep
          icon={AppWindow}
          title={t('hotkeysIntroFixTitle')}
          description={t('hotkeysIntroFixDesc')}
        />
        <IntroStep
          icon={Zap}
          title={t('hotkeysIntroResultTitle')}
          description={t('hotkeysIntroResultDesc')}
        />
      </ol>

      <Button variant="outline" size="sm" asChild>
        <a href={HOTKEYS_DOCS_URL} target="_blank" rel="noopener noreferrer">
          {t('hotkeysIntroDocs')}
          <ExternalLink />
        </a>
      </Button>
    </div>
  );
});

export { BridgeIntro };
