import { Button } from '@sharkord/ui';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TSourcePickRequest } from '../../shared/types';
import { SourceGroup } from './source-group';

const SourcePicker = memo(() => {
  const { t } = useTranslation();
  const [request, setRequest] = useState<TSourcePickRequest | null>(null);

  useEffect(() => window.desktop.onSourcePickRequest(setRequest), []);

  const answer = useCallback(
    (sourceId: string | null) => {
      if (!request) {
        return;
      }

      window.desktop.answerSourcePick(request.requestId, sourceId);
      setRequest(null);
    },
    [request]
  );

  const handleCancel = useCallback(() => {
    answer(null);
  }, [answer]);

  useEffect(() => {
    if (!request) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        answer(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [request, answer]);

  const { screens, windows } = useMemo(() => {
    const sources = request ? request.sources : [];

    return {
      screens: sources.filter(({ kind }) => kind === 'screen'),
      windows: sources.filter(({ kind }) => kind === 'window')
    };
  }, [request]);

  if (!request) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-8">
      <div className="flex max-h-full w-full max-w-3xl flex-col gap-4 rounded-lg border border-border bg-background p-6">
        <h1 className="text-lg font-semibold">{t('sourcePicker.title')}</h1>
        <div className="flex flex-col gap-4 overflow-y-auto">
          <SourceGroup
            title={t('sourcePicker.screens')}
            sources={screens}
            onPick={answer}
          />
          <SourceGroup
            title={t('sourcePicker.windows')}
            sources={windows}
            onPick={answer}
          />
        </div>
        <Button variant="ghost" className="self-end" onClick={handleCancel}>
          {t('cancel')}
        </Button>
      </div>
    </div>
  );
});

export { SourcePicker };
