import { TRPCClientError } from '@trpc/client';

export type TTrpcErrors = Record<string, string | undefined>;

const GENERIC_ERROR = 'Something went wrong, please try again.';

const parseTrpcErrors = (err: unknown): TTrpcErrors => {
  if (!(err instanceof TRPCClientError)) {
    if (err instanceof Error) {
      return { _general: err.message || GENERIC_ERROR };
    }

    if (err && typeof err === 'object' && !Array.isArray(err)) {
      return err as TTrpcErrors;
    }

    return { _general: GENERIC_ERROR };
  }

  try {
    const parsed: {
      code: string;
      path: string[];
      message: string;
    }[] = JSON.parse(err.message);

    const fieldErrors = parsed.reduce<TTrpcErrors>((acc, issue) => {
      const field = issue.path?.[0] ?? '_general';

      acc[field] = issue.message;

      return acc;
    }, {});

    if (!Object.keys(fieldErrors).length) {
      return { _general: GENERIC_ERROR };
    }

    return fieldErrors;
  } catch {
    return { _general: err.message || GENERIC_ERROR };
  }
};

const getTrpcError = (err: unknown, fallback: string): string => {
  if (err instanceof TRPCClientError) {
    return err.message;
  }

  if (err instanceof Error) {
    return err.message;
  }

  return fallback;
};

export { getTrpcError, parseTrpcErrors };
