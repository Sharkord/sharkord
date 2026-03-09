import { getTRPCClient } from '@/lib/trpc';
import { getTrpcError } from '@sharkord/shared';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import type { TSearchResults, TUnifiedSearchResult } from './types';

const EMPTY_RESULTS: TSearchResults = { messages: [], files: [] };
const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

export const useSearch = (isOpen: boolean) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TSearchResults>(EMPTY_RESULTS);

  useEffect(() => {
    // reset state when dialog is closed
    if (!isOpen) {
      setQuery('');
      setResults(EMPTY_RESULTS);
      setLoading(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const trimmed = query.trim();

    if (!isOpen || trimmed.length < MIN_QUERY_LENGTH) {
      setResults(EMPTY_RESULTS);
      setLoading(false);

      return;
    }

    let cancelled = false;

    const load = async () => {
      const trpc = getTRPCClient();

      setLoading(true);

      try {
        const next = await trpc.messages.search.query({ query: trimmed });

        if (!cancelled) {
          setResults(next);
        }
      } catch (error) {
        toast.error(getTrpcError(error, 'Could not load search results.'));

        setResults(EMPTY_RESULTS);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    const timer = setTimeout(load, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      cancelled = true;
    };
  }, [query, isOpen]);

  const canSearch = query.trim().length >= MIN_QUERY_LENGTH;
  const totalResults = results.messages.length + results.files.length;

  // combine messages and files into a single list
  const unifiedResults: TUnifiedSearchResult[] = useMemo(
    () =>
      [
        ...results.messages.map((message) => ({
          type: 'message' as const,
          createdAt: message.createdAt,
          key: `message-${message.id}`,
          item: message
        })),
        ...results.files.map((fileResult) => ({
          type: 'file' as const,
          createdAt: fileResult.messageCreatedAt,
          key: `file-${fileResult.file.id}-${fileResult.messageId}`,
          item: fileResult
        }))
      ].sort((a, b) => b.createdAt - a.createdAt),
    [results]
  );

  return {
    query,
    setQuery,
    loading,
    canSearch,
    totalResults,
    unifiedResults
  };
};
