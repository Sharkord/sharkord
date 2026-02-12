import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

type TResolutionFpsControlProps = {
  resolution: string;
  framerate: number;
  onResolutionChange: (resolution: string) => void;
  onFramerateChange: (framerate: number) => void;
  disabled?: boolean;
};

const ResolutionFpsControl = memo(
  ({
    resolution,
    framerate,
    onResolutionChange,
    onFramerateChange,
    disabled
  }: TResolutionFpsControlProps) => {
    const { t } = useTranslation();

    return (
      <div className="flex items-center gap-2">
        <Label content={t('userSettings.devices.resolutionLabel')}>
          <Select
            value={resolution}
            onValueChange={onResolutionChange}
            disabled={disabled}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue
                placeholder={t('userSettings.devices.selectInputPlaceholder')}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="144p">144p</SelectItem>
                <SelectItem value="240p">240p</SelectItem>
                <SelectItem value="360p">360p</SelectItem>
                <SelectItem value="720p">720p</SelectItem>
                <SelectItem value="1080p">1080p</SelectItem>
                <SelectItem value="1440p">1440p</SelectItem>
                <SelectItem value="2160p">2160p</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Label>

        <Label content={t('userSettings.devices.framerateLabel')}>
          <Select
            value={framerate.toString()}
            onValueChange={(value) => onFramerateChange(+value)}
            disabled={disabled}
          >
            <SelectTrigger className="w-[160px]">
              <SelectValue
                placeholder={t('userSettings.devices.selectInputPlaceholder')}
              />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="5">5 fps</SelectItem>
                <SelectItem value="10">10 fps</SelectItem>
                <SelectItem value="15">15 fps</SelectItem>
                <SelectItem value="24">24 fps</SelectItem>
                <SelectItem value="30">30 fps</SelectItem>
                <SelectItem value="60">60 fps</SelectItem>
                <SelectItem value="120">120 fps</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </Label>
      </div>
    );
  }
);

export default ResolutionFpsControl;
