import { useCallback, useRef, useState } from "react";

type Refetcher = () => Promise<unknown> | unknown;

/**
 * State for a pull-to-refresh control. Pass everything the screen loads; they
 * refetch together and the spinner stays until all of them settle. A failed
 * refetch never throws (the screen's own error state reports it), and a second
 * pull while one is running is ignored.
 */
export function usePullRefresh(...refetchers: Refetcher[]) {
  const [refreshing, setRefreshing] = useState(false);
  // Always call the latest refetchers without changing onRefresh's identity.
  const latest = useRef(refetchers);
  latest.current = refetchers;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled(latest.current.map((refetch) => refetch()));
    } finally {
      setRefreshing(false);
    }
  }, []);

  return { refreshing, onRefresh: () => void onRefresh() };
}
