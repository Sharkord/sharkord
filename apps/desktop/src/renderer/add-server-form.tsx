import { Button, Input, Spinner } from '@sharkord/ui';
import { memo, useCallback, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { TAddServerError } from '../shared/types';

type TAddServerFormProps = {
  initialInput: string | null;
  canCancel: boolean;
  onCancel: () => void;
};

const DEFAULT_INPUT = import.meta.env.DEV ? 'localhost:4991' : '';

const ERROR_KEYS = {
  'invalid-url': 'errors.invalidUrl',
  unreachable: 'errors.unreachable',
  duplicate: 'errors.duplicate'
} as const satisfies Record<TAddServerError, string>;

const AddServerForm = memo(
  ({ initialInput, canCancel, onCancel }: TAddServerFormProps) => {
    const { t } = useTranslation();
    const [input, setInput] = useState(initialInput ?? DEFAULT_INPUT);
    const [error, setError] = useState<TAddServerError | null>(null);
    const [busy, setBusy] = useState(false);

    const handleChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
      setInput(event.target.value);
    }, []);

    const handleSubmit = useCallback(async () => {
      if (busy || !input.trim()) {
        return;
      }

      setBusy(true);

      try {
        const result = await window.desktop.addServer(input);

        setError(result);
      } catch {
        setError('unreachable');
      } finally {
        setBusy(false);
      }
    }, [busy, input]);

    const errorMessage = error ? t(ERROR_KEYS[error]) : undefined;
    const title = canCancel ? t('addServerTitle') : t('welcomeTitle');

    return (
      <div className="flex w-80 flex-col gap-3">
        <h1 className="text-xl font-semibold">{title}</h1>
        <p className="text-muted-foreground text-sm">
          {t('addServerDescription')}
        </p>
        <Input
          autoFocus
          value={input}
          onChange={handleChange}
          onEnter={handleSubmit}
          error={errorMessage}
          placeholder="chat.example.com"
          spellCheck={false}
          className="select-text"
        />
        <Button onClick={handleSubmit} disabled={busy || !input.trim()}>
          {busy && <Spinner size="xxs" />}
          {busy ? t('connecting') : t('connect')}
        </Button>
        {canCancel && (
          <Button variant="ghost" onClick={onCancel}>
            {t('cancel')}
          </Button>
        )}
      </div>
    );
  }
);

export { AddServerForm };
