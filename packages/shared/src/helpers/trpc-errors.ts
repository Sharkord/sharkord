import { TRPCClientError } from '@trpc/client';

export type TTrpcErrors = Record<string, string | undefined>;

const parseTrpcErrors = (err: unknown): TTrpcErrors => {
  if (!(err instanceof TRPCClientError)) {
    if (typeof err === 'object') {
      return err as TTrpcErrors;
    }

    return { _general: 'Something went wrong, please try again.' };
  }

  try {
    const parsed: {
      code: string;
      path: string[];
      message: string;
    }[] = JSON.parse(err.message);

    return parsed.reduce<TTrpcErrors>((acc, issue) => {
      const field = issue.path?.[0] ?? '_general';

      acc[field] = issue.message;

      return acc;
    }, {});
  } catch {
    return { _general: err.message };
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
