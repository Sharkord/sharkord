import { memo } from 'react';
import { useTranslation } from 'react-i18next';

type TCommandResponseProps = {
  response: string | null;
};

const CommandResponse = memo(({ response }: TCommandResponseProps) => {
  const { t } = useTranslation('dialogs');

  if (response === null) return null;

  return (
    <div className="flex flex-col gap-1">
      <p className="text-xs font-semibold">{t('responseLabel')}</p>
      <pre className="text-xs bg-muted/30 p-3 rounded overflow-x-auto whitespace-pre-wrap">
        {response}
      </pre>
    </div>
  );
});

export { CommandResponse };
