import { useForm } from '@/hooks/use-form';
import { getTrpcError } from '@sharkord/shared';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useSettingsFormSlot } from './context';
import { hasUnsavedChanges } from './helpers';

// baseline holds the values as last loaded or saved, so a form can skip what is already persisted
type TUseSettingsFormOptions<T> = {
  initialValues: T;
  onSave: (values: T, baseline: T) => Promise<void>;
  successMessage: string;
  errorMessage: string;
};

const useSettingsForm = <T extends Record<string, unknown>>({
  initialValues,
  onSave,
  successMessage,
  errorMessage
}: TUseSettingsFormOptions<T>) => {
  const form = useForm<T>(initialValues);
  const { values, setValues, setTrpcErrors } = form;
  const [baseline, setBaseline] = useState<T>(initialValues);
  const [isSaving, setIsSaving] = useState(false);
  const setSlot = useSettingsFormSlot();

  const isDirty = hasUnsavedChanges(values, baseline);

  const reset = useCallback(
    (nextValues: T) => {
      setValues(nextValues);
      setBaseline(nextValues);
    },
    [setValues]
  );

  const save = useCallback(async () => {
    if (isSaving) return;

    setIsSaving(true);

    try {
      await onSave(values, baseline);
      setBaseline(values);
      toast.success(successMessage);
    } catch (error) {
      setTrpcErrors(error);
      toast.error(getTrpcError(error, errorMessage));
    } finally {
      setIsSaving(false);
    }
  }, [
    isSaving,
    onSave,
    values,
    baseline,
    setTrpcErrors,
    successMessage,
    errorMessage
  ]);

  const handleRef = useRef<object | null>(null);

  useEffect(() => {
    const handle = { isDirty, isSaving, save };

    handleRef.current = handle;
    setSlot(handle);

    return () => {
      // a sibling form may have claimed the slot already while this one was unmounting
      setSlot((current) => (current === handleRef.current ? null : current));
    };
  }, [isDirty, isSaving, save, setSlot]);

  return { ...form, isDirty, isSaving, save, reset };
};

export { useSettingsForm };
