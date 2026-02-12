import { TRPCClientError } from '@trpc/client';
import { i18n } from '@/i18n';
import { mapApiError } from './map-api-error';

export type TTrpcErrors = Record<string, string | undefined>;

type TParsedIssue = {
  code?: string;
  path: string[];
  message: string;
};

const parseIssues = (value: string): TParsedIssue[] | undefined => {
  try {
    const parsed = JSON.parse(value) as TParsedIssue[];

    if (!Array.isArray(parsed)) {
      return undefined;
    }

    return parsed;
  } catch {
    return undefined;
  }
};

const getTrpcCode = (err: TRPCClientError<any>): string | undefined => {
  const data = err.data as { code?: string } | undefined;

  return data?.code;
};

const parseTrpcErrors = (err: unknown): TTrpcErrors => {
  if (!(err instanceof TRPCClientError)) {
    if (typeof err === 'object') {
      return err as TTrpcErrors;
    }

    return { _general: i18n.t('errors.generic') };
  }

  const parsed = parseIssues(err.message);

  if (parsed) {
    return parsed.reduce<TTrpcErrors>((acc, issue) => {
      const field = issue.path?.[0] ?? '_general';

      acc[field] =
        mapApiError({ code: issue.code, message: issue.message }) ||
        issue.message;

      return acc;
    }, {});
  }

  const mappedError = mapApiError({
    code: getTrpcCode(err),
    message: err.message
  });

  return { _general: mappedError || err.message };
};

const getTrpcError = (err: unknown, fallback: string): string => {
  if (err instanceof TRPCClientError) {
    const parsed = parseIssues(err.message);

    if (parsed?.length) {
      const firstIssue = parsed[0];
      const mappedIssue = mapApiError({
        code: firstIssue.code,
        message: firstIssue.message
      });

      if (mappedIssue) {
        return mappedIssue;
      }

      return firstIssue.message;
    }

    const mappedError = mapApiError({
      code: getTrpcCode(err),
      message: err.message
    });

    return mappedError || err.message;
  }

  if (err instanceof Error) {
    return mapApiError({ message: err.message }) || err.message;
  }

  return fallback;
};

export { getTrpcError, parseTrpcErrors };
