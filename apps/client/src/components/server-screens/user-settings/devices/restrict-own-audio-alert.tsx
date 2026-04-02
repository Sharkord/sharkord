import { Info } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const RESTRICT_OWN_AUDIO_COMPATIBILITY_URL =
  'https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackSettings/restrictOwnAudio#browser_compatibility';

type TRestrictOwnAudioAlertProps = {
  isSupported: boolean;
};

const RestrictOwnAudioAlert = memo(
  ({ isSupported }: TRestrictOwnAudioAlertProps) => {
    const { t } = useTranslation('settings');

    if (isSupported) {
      return null;
    }

    return (
      <div className="flex items-start gap-2 rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          {t('restrictOwnAudioUnsupported')}{' '}
          <a
            href={RESTRICT_OWN_AUDIO_COMPATIBILITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline transition-colors hover:text-primary"
          >
            {t('restrictOwnAudioCompatibilityLink')}
          </a>
        </p>
      </div>
    );
  }
);

export { RestrictOwnAudioAlert };
