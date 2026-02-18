import { getTRPCClient } from '@/lib/trpc';
import { cn } from '@/lib/utils';
import {
  ChannelType,
  parseTrpcErrors,
  type TTrpcErrors
} from '@sharkord/shared';
import {
  AutoFocus,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Group,
  Input
} from '@sharkord/ui';
import { Hash, Mic } from 'lucide-react';
import { memo, useCallback, useState } from 'react';
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
    const [channelType, setChannelType] = useState(defaultChannelType);
    const [name, setName] = useState('New Channel');
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
            <DialogTitle>Create New Channel</DialogTitle>
          </DialogHeader>

          <Group label="Channel type">
            <ChannelTypeItem
              title="Text Channel"
              description="Share text, images, files and more"
              icon={<Hash className="h-6 w-6" />}
              isActive={channelType === ChannelType.TEXT}
              onClick={() => setChannelType(ChannelType.TEXT)}
            />

            <ChannelTypeItem
              title="Voice Channel"
              description="Hangout with voice, video and screen sharing"
              icon={<Mic className="h-6 w-6" />}
              isActive={channelType === ChannelType.VOICE}
              onClick={() => setChannelType(ChannelType.VOICE)}
            />
          </Group>

          <Group label="Channel name">
            <AutoFocus>
              <Input
                placeholder="Channel name"
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
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
              disabled={loading || !name || !channelType}
            >
              Create channel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }
);

export { CreateChannelDialog };
