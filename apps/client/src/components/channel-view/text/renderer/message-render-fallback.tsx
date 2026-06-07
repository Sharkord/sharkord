import { Alert, AlertDescription } from '@sharkord/ui';
import { AlertCircle } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

type TMessageRenderFallbackProps = {
  error: Error;
  reset: () => void;
};

const MessageRenderFallback = memo(({ error }: TMessageRenderFallbackProps) => {
  const { t } = useTranslation();

  return (
    <div className="not-prose my-1">
      <Alert variant="destructive" className="py-2">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-start justify-between gap-3 text-xs sm:text-sm">
          <div className="min-w-0">
            <p className="font-medium">{t('messageRenderFailed')}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('messageRenderGithubIssue')}
            </p>

            <details className="mt-2">
              <summary className="cursor-pointer text-xs">
                {t('errorDetails')}
              </summary>

              <p className="mt-2 wrap-break-word text-xs text-muted-foreground">
                {error.message}
              </p>
            </details>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
});

export { MessageRenderFallback };
