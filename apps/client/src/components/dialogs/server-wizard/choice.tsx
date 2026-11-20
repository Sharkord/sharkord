import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';
import { memo, useCallback, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

type TChoiceOptionProps = {
  value: boolean;
  selected: boolean;
  description: string;
  onSelect: (value: boolean) => void;
};

const ChoiceOption = memo(
  ({ value, selected, description, onSelect }: TChoiceOptionProps) => {
    const { t } = useTranslation('dialogs');

    const handleClick = useCallback(() => onSelect(value), [onSelect, value]);

    const Icon = value ? Check : X;

    return (
      <button
        type="button"
        aria-pressed={selected}
        onClick={handleClick}
        className={cn(
          'flex flex-1 flex-col gap-2 rounded-lg border-2 p-4 text-left transition-colors cursor-pointer',
          selected
            ? 'border-primary bg-primary/10'
            : 'border-border hover:bg-accent'
        )}
      >
        <span className="flex items-center gap-2 text-base font-semibold">
          <Icon className="h-5 w-5" />
          {value ? t('serverWizardEnable') : t('serverWizardDisable')}
        </span>
        <span className="text-sm text-muted-foreground">{description}</span>
      </button>
    );
  }
);

type TChoiceProps = {
  question: string;
  enableDescription: string;
  disableDescription: string;
  value: boolean;
  onChange: (value: boolean) => void;
  children?: ReactNode;
};

const Choice = memo(
  ({
    question,
    enableDescription,
    disableDescription,
    value,
    onChange,
    children
  }: TChoiceProps) => (
    <div className="flex flex-col gap-3">
      <span className="font-medium">{question}</span>
      <div className="flex flex-col gap-3 sm:flex-row">
        <ChoiceOption
          value
          selected={value}
          description={enableDescription}
          onSelect={onChange}
        />
        <ChoiceOption
          value={false}
          selected={!value}
          description={disableDescription}
          onSelect={onChange}
        />
      </div>
      {children}
    </div>
  )
);

export { Choice };
