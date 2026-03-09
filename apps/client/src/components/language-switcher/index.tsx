import { SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@sharkord/ui';
import { Languages } from 'lucide-react';
import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';

type TLanguageSwitcherProps = {
  variant?: 'icon' | 'full';
};

const LanguageSwitcher = memo(
  ({ variant = 'full' }: TLanguageSwitcherProps) => {
    const { i18n } = useTranslation();

    const handleChange = useCallback(
      (value: string) => {
        i18n.changeLanguage(value as SupportedLanguage);
      },
      [i18n]
    );

    return (
      <Select value={i18n.language} onValueChange={handleChange}>
        <SelectTrigger
          className={variant === 'icon' ? 'w-auto gap-1 px-2' : 'w-36'}
        >
          {variant === 'icon' && <Languages className="h-4 w-4 shrink-0" />}
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SUPPORTED_LANGUAGES.map((lang) => (
            <SelectItem key={lang.code} value={lang.code}>
              {lang.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }
);

export { LanguageSwitcher };
