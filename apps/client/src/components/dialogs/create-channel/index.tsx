import { AutoFocus } from '@/components/ui/auto-focus';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Group } from '@/components/ui/group';
import { Input } from '@/components/ui/input';
import { parseTrpcErrors, type TTrpcErrors } from '@/helpers/parse-trpc-errors';
import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import { ChannelType } from '@sharkord/shared';
import { Hash, Mic } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TDialogBaseProps } from '../types';

type TChannelTypeItemProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
  isActive: boolean;
  onClick: () => void;
};

const ChannelTypeItem = ({
  icon,
  title,
  description,
  isActive,
  onClick
}: TChannelTypeItemProps) => (
  <div
    className={cn(
      'flex items-center gap-2 p-2 rounded-md cursor-pointer',
      isActive && 'ring-2 ring-primary bg-primary/10'
    )}
    onClick={onClick}
  >
    {icon}
    <div className="flex flex-col">
      <span>{title}</span>
      <span className="text-sm text-primary/60">{description}</span>
    </div>
  </div>
);

type TCreateChannelDialogProps = TDialogBaseProps & {
  categoryId: number;
  defaultChannelType?: ChannelType;
};

const CreateChannelDialog = memo(
  ({
    isOpen,
    categoryId,
    close,
    defaultChannelType = ChannelType.TEXT
  }: TCreateChannelDialogProps) => {
    const { t } = useTranslation();
    const [channelType, setChannelType] = useState(defaultChannelType);
    const [name, setName] = useState(t('dialogs.createChannel.defaultName'));
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<TTrpcErrors>({});

    const onSubmit = useCallback(async () => {
      const trpc = getTRPCClient();

      setLoading(true);

      try {
        await trpc.channels.add.mutate({
          type: channelType,
          name,
          categoryId
        });

        close();
      } catch (error) {
        setErrors(parseTrpcErrors(error));
      } finally {
        setLoading(false);
      }
    }, [name, categoryId, close, channelType]);

    return (
      <Dialog open={isOpen}>
        <DialogContent onInteractOutside={close} close={close}>
          <DialogHeader>
            <DialogTitle>{t('dialogs.createChannel.title')}</DialogTitle>
          </DialogHeader>

          <Group label={t('dialogs.createChannel.channelTypeLabel')}>
            <ChannelTypeItem
              title={t('dialogs.createChannel.textChannelTitle')}
              description={t('dialogs.createChannel.textChannelDescription')}
              icon={<Hash className="h-6 w-6" />}
              isActive={channelType === ChannelType.TEXT}
              onClick={() => setChannelType(ChannelType.TEXT)}
            />

            <ChannelTypeItem
              title={t('dialogs.createChannel.voiceChannelTitle')}
              description={t('dialogs.createChannel.voiceChannelDescription')}
              icon={<Mic className="h-6 w-6" />}
              isActive={channelType === ChannelType.VOICE}
              onClick={() => setChannelType(ChannelType.VOICE)}
            />
          </Group>

          <Group label={t('dialogs.createChannel.channelNameLabel')}>
            <AutoFocus>
              <Input
                placeholder={t('dialogs.createChannel.channelNamePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
                name="name"
                error={errors.name}
                resetError={setErrors}
                onEnter={onSubmit}
              />
            </AutoFocus>
          </Group>

          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={close}>
              {t('dialogs.createChannel.cancel')}
            </Button>
            <Button
              onClick={onSubmit}
              disabled={loading || !name || !channelType}
            >
              {t('dialogs.createChannel.createChannel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

export { CreateChannelDialog };
