import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';

type RefreshHandler = () => Promise<void>;

type PullToRefreshContextValue = {
  registerRefresh: (handler: RefreshHandler) => () => void;
  runRefresh: () => Promise<void>;
};

const PullToRefreshContext = createContext<PullToRefreshContextValue | null>(null);

export function PullToRefreshProvider({ children }: { children: ReactNode }) {
  const handlerRef = useRef<RefreshHandler | null>(null);

  const registerRefresh = useCallback((handler: RefreshHandler) => {
    handlerRef.current = handler;
    return () => {
      if (handlerRef.current === handler) {
        handlerRef.current = null;
      }
    };
  }, []);

  const runRefresh = useCallback(async () => {
    if (handlerRef.current) {
      await handlerRef.current();
    }
  }, []);

  const value = useMemo(
    () => ({ registerRefresh, runRefresh }),
    [registerRefresh, runRefresh]
  );

  return (
    <PullToRefreshContext.Provider value={value}>{children}</PullToRefreshContext.Provider>
  );
}

/** Register the active route's pull-to-refresh handler (clears on unmount). */
export function useRegisterPullToRefresh(onRefresh: () => Promise<void>) {
  const ctx = useContext(PullToRefreshContext);
  if (!ctx) {
    throw new Error('useRegisterPullToRefresh must be used within PullToRefreshProvider');
  }

  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const stableHandler = useCallback(async () => {
    await onRefreshRef.current();
  }, []);

  useEffect(() => ctx.registerRefresh(stableHandler), [ctx, stableHandler]);
}

export function usePullToRefreshRunner() {
  const ctx = useContext(PullToRefreshContext);
  if (!ctx) {
    throw new Error('usePullToRefreshRunner must be used within PullToRefreshProvider');
  }
  return ctx.runRefresh;
}
