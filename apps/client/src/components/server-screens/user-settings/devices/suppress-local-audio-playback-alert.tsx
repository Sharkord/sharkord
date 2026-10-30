import { Info } from 'lucide-react';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const SUPPRESS_LOCAL_AUDIO_PLAYBACK_COMPATIBILITY_URL =
  'https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackSettings/suppressLocalAudioPlayback#browser_compatibility';

type TSuppressLocalAudioPlaybackAlertProps = {
  isSupported: boolean;
};

const SuppressLocalAudioPlaybackAlert = memo(
  ({ isSupported }: TSuppressLocalAudioPlaybackAlertProps) => {
    const { t } = useTranslation('settings');

    if (isSupported) {
      return null;
    }

    return (
      <div className="flex items-start gap-2 rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <p>
          {t('suppressLocalAudioPlaybackUnsupported')}{' '}
          <a
            href={SUPPRESS_LOCAL_AUDIO_PLAYBACK_COMPATIBILITY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="underline transition-colors hover:text-primary"
          >
            {t('suppressLocalAudioPlaybackCompatibilityLink')}
          </a>
        </p>
      </div>
    );
  }
);

export { SuppressLocalAudioPlaybackAlert };
