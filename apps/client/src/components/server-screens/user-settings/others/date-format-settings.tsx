import { useDateFormat } from '@/hooks/use-date-format';
import { useDateLocale } from '@/hooks/use-date-locale';
import {
  Group,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch
} from '@sharkord/ui';
import type { Locale } from 'date-fns';
import { format } from 'date-fns';
import { memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

const DATE_FORMAT_VALUES = [
  { value: 'PP' },
  { value: 'PPP' },
  { value: 'P' },
  { value: 'yyyy-MM-dd' }
] as const;

const TIME_FORMAT_VALUES = [
  { value: 'p' },
  { value: 'pp' },
  { value: 'HH:mm' },
  { value: 'HH:mm:ss' }
] as const;

const generatePresetLabels = (
  presets: readonly { value: string }[],
  previewDate: Date,
  locale: Locale
) => {
  return presets.map((preset) => {
    try {
      return {
        ...preset,
        label: format(previewDate, preset.value, { locale })
      };
    } catch {
      return { ...preset, label: preset.value };
    }
  });
};

type FormatSelectorProps = {
  label: string;
  description: string;
  presets: readonly { value: string; label: string }[];
  currentFormat: string;
  onFormatChange: (format: string) => void;
};

const FormatSelector = memo(
  ({
    label,
    description,
    presets,
    currentFormat,
    onFormatChange
  }: FormatSelectorProps) => (
    <Group label={label} description={description}>
      <Select value={currentFormat} onValueChange={onFormatChange}>
        <SelectTrigger className="min-w-40">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {presets.map((preset) => (
            <SelectItem key={preset.value} value={preset.value}>
              {preset.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Group>
  )
);

FormatSelector.displayName = 'FormatSelector';

const DateFormatSettings = memo(() => {
  const { t } = useTranslation('settings');
  const {
    dateFormat,
    timeFormat,
    preferAbsoluteTime,
    setDateFormat,
    setTimeFormat,
    setPreferAbsoluteTime
  } = useDateFormat();
  const dateLocale = useDateLocale();

  const previewDate = useMemo(() => new Date(2024, 7, 12, 14, 30, 0), []);

  const dateFormatPresets = useMemo(
    () => generatePresetLabels(DATE_FORMAT_VALUES, previewDate, dateLocale),
    [previewDate, dateLocale]
  );

  const timeFormatPresets = useMemo(
    () => generatePresetLabels(TIME_FORMAT_VALUES, previewDate, dateLocale),
    [previewDate, dateLocale]
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <FormatSelector
          label={t('dateFormatLabel')}
          description={t('dateFormatDesc')}
          presets={dateFormatPresets}
          currentFormat={dateFormat}
          onFormatChange={setDateFormat}
        />
        <FormatSelector
          label={t('timeFormatLabel')}
          description={t('timeFormatDesc')}
          presets={timeFormatPresets}
          currentFormat={timeFormat}
          onFormatChange={setTimeFormat}
        />
      </div>

      <Group
        label={t('preferAbsoluteTimeLabel')}
        description={t('preferAbsoluteTimeDesc')}
      >
        <Switch
          checked={preferAbsoluteTime}
          onCheckedChange={setPreferAbsoluteTime}
        />
      </Group>
    </div>
  );
});

DateFormatSettings.displayName = 'DateFormatSettings';

export { DateFormatSettings };
