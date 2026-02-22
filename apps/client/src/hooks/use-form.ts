import { parseTrpcErrors, type TTrpcErrors } from '@sharkord/shared';
import { useCallback, useState } from 'react';

const useForm = <T extends Record<string, unknown>>(initialValues: T) => {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<TTrpcErrors>({});

  const registerInput = useCallback(
    (key: keyof T, type?: string) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const onChange = (e: React.ChangeEvent<any>) => {
        const newValue = e.target.value;
        const value = type === 'number' ? +newValue : newValue;

        setErrors((prev) => ({ ...prev, [key]: undefined }));
        setValues((prev) => ({ ...prev, [key]: value as T[keyof T] }));
      };

      const value = String(values[key] ?? '');

      return {
        value,
        onChange,
        name: key.toString(),
        type,
        error: errors[key as string]
      };
    },
    [values, errors]
  );

  const registerRaw = useCallback(
    (key: keyof T) => {
      const onChange = (value: T[keyof T]) => {
        setErrors((prev) => ({ ...prev, [key]: undefined }));
        setValues((prev) => ({ ...prev, [key]: value }));
      };

      const value = values[key] ?? '';

      return {
        value,
        onChange,
        name: key.toString(),
        error: errors[key as string]
      };
    },
    [values, errors]
  );

  const setTrpcErrors = useCallback(
    (error: unknown) => {
      setErrors(parseTrpcErrors(error));
    },
    [setErrors]
  );

  const onChange = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      setValues((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => ({ ...prev, [key]: undefined }));
    },
    [setValues]
  );

  const registerRawNumber = useCallback(
    (key: keyof T) => {
      const onChange = (value: number | undefined) => {
        setErrors((prev) => ({ ...prev, [key]: undefined }));
        setValues((prev) => ({ ...prev, [key]: value as T[keyof T] }));
      };

      const value = values[key] as number | undefined;

      return {
        value,
        onChange,
        error: errors[key as string]
      };
    },
    [values, errors, setValues, setErrors]
  );

  const setErrorsDirectly = useCallback(
    (newErrors: TTrpcErrors) => {
      setErrors(newErrors);
    },
    [setErrors]
  );

  const setError = useCallback(
    <K extends keyof T>(key: K | '_general', errorMessage: string | undefined) => {
      setErrors((prev) => ({ ...prev, [key]: errorMessage }));
    },
    [setErrors]
  );

  const setValue = useCallback(
    <K extends keyof T>(key: K | '_general', value: T[keyof T] ) => {
      setValues((prev) => ({ ...prev, [key]: value }));
    },
    [setValues]
  );

  return {
    values,
    errors,
    setValues,
    setErrors: setErrorsDirectly,
    setTrpcErrors,
    r: registerInput,
    rr: registerRaw,
    rrn: registerRawNumber,
    onChange,
    setError,
    setValue
  };
};

export { useForm };
