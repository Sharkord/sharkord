import {
  IconButton,
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@sharkord/ui';
import { HelpCircle } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

// quality is at the same bitrate. chromium on windows encodes h264 constrained baseline with openh264
// on the cpu, only h264 high reaches the gpu encoder. firefox only receives constrained baseline,
// so it cannot watch h264 high
const CODECS = [
  {
    name: 'VP8',
    qualityKey: 'codecQualityBasic',
    encoderKey: 'codecEncoderCpuLight',
    limited: false
  },
  {
    name: 'H264',
    qualityKey: 'codecQualityBasic',
    encoderKey: 'codecEncoderCpu',
    limited: false
  },
  {
    name: 'H264 High',
    qualityKey: 'codecQualityGood',
    encoderKey: 'codecEncoderGpu',
    limited: true
  },
  {
    name: 'VP9',
    qualityKey: 'codecQualityGreat',
    encoderKey: 'codecEncoderCpu',
    limited: false
  },
  {
    name: 'AV1',
    qualityKey: 'codecQualityBest',
    encoderKey: 'codecEncoderCpuHeavy',
    limited: false
  }
] as const;

type TCodecHelpRowProps = {
  name: string;
  quality: string;
  encoder: string;
  limited: boolean;
};

const CodecHelpRow = memo(
  ({ name, quality, encoder, limited }: TCodecHelpRowProps) => (
    <tr>
      <td className="py-1 pr-3 font-medium">
        {name}
        {limited && '*'}
      </td>
      <td className="py-1 pr-3 text-muted-foreground">{quality}</td>
      <td className="py-1 text-muted-foreground">{encoder}</td>
    </tr>
  )
);

type TCodecHelpNoteProps = {
  children: React.ReactNode;
};

const CodecHelpNote = memo(({ children }: TCodecHelpNoteProps) => (
  <p className="mt-3 text-xs text-muted-foreground">{children}</p>
));

type TCodecHelpPopoverProps = {
  simulcastEnabled: boolean;
};

const CodecHelpPopover = memo(
  ({ simulcastEnabled }: TCodecHelpPopoverProps) => {
    const { t } = useTranslation('settings');

    return (
      <Popover>
        <PopoverTrigger asChild>
          <IconButton
            type="button"
            variant="ghost"
            icon={HelpCircle}
            size="xs"
            title={t('codecHelpTitle')}
          />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80">
          <p className="mb-2 text-sm font-medium">{t('codecHelpTitle')}</p>
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-muted-foreground">
                <th className="pb-1 pr-3 font-normal">{t('codecLabel')}</th>
                <th className="pb-1 pr-3 font-normal">
                  {t('codecHelpQuality')}
                </th>
                <th className="pb-1 font-normal">{t('codecHelpEncodedOn')}</th>
              </tr>
            </thead>
            <tbody>
              {CODECS.map(({ name, qualityKey, encoderKey, limited }) => (
                <CodecHelpRow
                  key={name}
                  name={name}
                  quality={t(qualityKey)}
                  encoder={t(encoderKey)}
                  limited={limited}
                />
              ))}
            </tbody>
          </table>
          <CodecHelpNote>{t('codecHelpAuto')}</CodecHelpNote>
          <CodecHelpNote>{t('codecHelpGpuNote')}</CodecHelpNote>
          <CodecHelpNote>* {t('codecHelpLimitedNote')}</CodecHelpNote>
          {simulcastEnabled && (
            <CodecHelpNote>{t('codecHelpSimulcast')}</CodecHelpNote>
          )}
        </PopoverContent>
      </Popover>
    );
  }
);

export { CodecHelpPopover };
