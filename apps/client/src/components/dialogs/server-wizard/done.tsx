import {
  Button,
  DialogContent,
  DialogDescription,
  DialogTitle
} from '@sharkord/ui';
import { PartyPopper } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

type TServerWizardDoneProps = {
  serverName: string;
  close: () => void;
};

const ServerWizardDone = memo(
  ({ serverName, close }: TServerWizardDoneProps) => {
    const { t } = useTranslation('dialogs');

    return (
      <DialogContent close={close} className="sm:max-w-3xl">
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <PartyPopper className="h-8 w-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl">
            {t('serverWizardDoneTitle', { serverName })}
          </DialogTitle>
          <DialogDescription className="max-w-md text-base">
            {t('serverWizardDoneDesc')}
          </DialogDescription>
          <Button size="lg" className="mt-2" onClick={close}>
            {t('serverWizardDoneButton')}
          </Button>
        </div>
      </DialogContent>
    );
  }
);

export { ServerWizardDone };
