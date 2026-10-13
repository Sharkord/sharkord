import { formatCombo, isReservedCombo } from '@sharkord/ui';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

type TUseHotkeyInputParams = {
  onChange: (combo?: string) => void;
  findConflict: (combo: string) => string | undefined;
};

const useHotkeyInput = ({ onChange, findConflict }: TUseHotkeyInputParams) => {
  const { t } = useTranslation('settings');

  const labels = useMemo(
    () => ({
      unbound: t('hotkeyNotBound'),
      recording: t('hotkeyRecording'),
      clear: t('hotkeyClear'),
      hint: t('hotkeyRecordingHint')
    }),
    [t]
  );

  const handleChange = useCallback(
    (next: string) => {
      if (isReservedCombo(next)) {
        return t('hotkeyReserved', { combo: formatCombo(next) });
      }

      const conflict = findConflict(next);

      if (conflict) {
        return t('hotkeyConflict', { action: conflict });
      }

      onChange(next);

      return undefined;
    },
    [findConflict, onChange, t]
  );

  const handleClear = useCallback(() => {
    onChange(undefined);
  }, [onChange]);

  return { labels, onChange: handleChange, onClear: handleClear };
};

export { useHotkeyInput };
