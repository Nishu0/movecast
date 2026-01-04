import { useEffect, useState, useCallback } from "react";
import { showToast, Toast } from "@raycast/api";

interface UseFetchResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useFetch<T>(
  fetchFn: () => Promise<T>,
  options?: {
    onError?: string;
    deps?: unknown[];
  }
): UseFetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const deps = options?.deps ?? [];

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      setData(result);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error("Unknown error");
      setError(errorObj);

      if (options?.onError) {
        await showToast({
          style: Toast.Style.Failure,
          title: options.onError,
          message: errorObj.message,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, [fetchFn, options?.onError]);

  useEffect(() => {
    fetchData();
  }, [...deps, fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}