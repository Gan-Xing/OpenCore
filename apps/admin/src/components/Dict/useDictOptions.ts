import type { DictDataOptionSummary } from '@opencore/sdk';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { listOpenCoreDictDataOptions } from '@/services/opencore/platform';

type UseDictOptionsOptions = {
  enabledOnly?: boolean;
};

type UseDictOptionsResult = {
  error?: string;
  loading: boolean;
  options: readonly DictDataOptionSummary[];
  reload: () => Promise<void>;
};

const dictOptionsCache = new Map<string, readonly DictDataOptionSummary[]>();

function getCacheKey(dictCode: string): string {
  return dictCode.trim();
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '字典选项加载失败。';
}

export function clearDictOptionsCache(dictCode?: string): void {
  if (dictCode) {
    dictOptionsCache.delete(getCacheKey(dictCode));
    return;
  }

  dictOptionsCache.clear();
}

export async function loadDictOptions(
  dictCode: string,
): Promise<readonly DictDataOptionSummary[]> {
  const cacheKey = getCacheKey(dictCode);
  const cached = dictOptionsCache.get(cacheKey);

  if (cached) {
    return cached;
  }

  const options = await listOpenCoreDictDataOptions({ dictCode: cacheKey });
  dictOptionsCache.set(cacheKey, options);
  return options;
}

export function useDictOptions(
  dictCode?: string,
  options: UseDictOptionsOptions = {},
): UseDictOptionsResult {
  const cacheKey = dictCode ? getCacheKey(dictCode) : undefined;
  const [rows, setRows] = useState<readonly DictDataOptionSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();
  const reload = useCallback(async () => {
    if (!cacheKey) {
      setRows([]);
      setError(undefined);
      return;
    }

    setLoading(true);
    try {
      clearDictOptionsCache(cacheKey);
      const nextRows = await loadDictOptions(cacheKey);
      setRows(nextRows);
      setError(undefined);
    } catch (nextError: unknown) {
      setRows([]);
      setError(getErrorMessage(nextError));
    } finally {
      setLoading(false);
    }
  }, [cacheKey]);

  useEffect(() => {
    let active = true;

    if (!cacheKey) {
      setRows([]);
      setError(undefined);
      return () => {
        active = false;
      };
    }

    const cached = dictOptionsCache.get(cacheKey);
    if (cached) {
      setRows(cached);
      setError(undefined);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    loadDictOptions(cacheKey)
      .then((nextRows) => {
        if (active) {
          setRows(nextRows);
          setError(undefined);
        }
      })
      .catch((nextError: unknown) => {
        if (active) {
          setRows([]);
          setError(getErrorMessage(nextError));
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [cacheKey]);

  const visibleRows = useMemo(() => {
    if (options.enabledOnly === false) {
      return rows;
    }

    return rows.filter((row) => row.enabled);
  }, [options.enabledOnly, rows]);

  return {
    error,
    loading,
    options: visibleRows,
    reload,
  };
}
