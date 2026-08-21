import { useEffect, useRef, useState } from 'react';
import {
  DEFAULT_PULL_THRESHOLD_PX,
  isVerticalDominantPull,
  nextPullStatus,
  resistedPullDistance,
  shouldStartPull,
  type PullStatus,
} from '../lib/pullToRefreshLogic';

export type UsePullToRefreshOptions = {
  onRefresh: () => Promise<void>;
  enabled?: boolean;
  thresholdPx?: number;
};

export type UsePullToRefreshResult = {
  isRefreshing: boolean;
  pullDistance: number;
  status: PullStatus;
};

function isTouchCapable(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

function getScrollTop(): number {
  return window.scrollY || document.documentElement.scrollTop || 0;
}

/**
 * Touch-only pull-to-refresh at document scroll top.
 * Mouse/keyboard users are unaffected (no focus trap).
 */
export function usePullToRefresh({
  onRefresh,
  enabled = true,
  thresholdPx = DEFAULT_PULL_THRESHOLD_PX,
}: UsePullToRefreshOptions): UsePullToRefreshResult {
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const startY = useRef(0);
  const startX = useRef(0);
  const armed = useRef(false);
  const pulling = useRef(false);
  const distanceRef = useRef(0);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);

  onRefreshRef.current = onRefresh;
  refreshingRef.current = refreshing;
  distanceRef.current = pullDistance;

  const active = enabled && isTouchCapable();
  const status = nextPullStatus(pullDistance, thresholdPx, refreshing);

  useEffect(() => {
    if (!active) {
      armed.current = false;
      pulling.current = false;
      distanceRef.current = 0;
      setPullDistance(0);
      return;
    }

    const resetGesture = () => {
      armed.current = false;
      pulling.current = false;
      distanceRef.current = 0;
      setPullDistance(0);
    };

    const onTouchStart = (event: TouchEvent) => {
      if (refreshingRef.current || event.touches.length !== 1) {
        return;
      }
      if (!shouldStartPull(getScrollTop(), true, refreshingRef.current)) {
        armed.current = false;
        return;
      }
      const touch = event.touches[0];
      startY.current = touch.clientY;
      startX.current = touch.clientX;
      armed.current = true;
      pulling.current = false;
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!armed.current || refreshingRef.current || event.touches.length !== 1) {
        return;
      }
      if (getScrollTop() > 0) {
        resetGesture();
        return;
      }

      const touch = event.touches[0];
      const dx = touch.clientX - startX.current;
      const dy = touch.clientY - startY.current;

      if (!pulling.current) {
        if (!isVerticalDominantPull(dx, dy)) {
          if (Math.abs(dx) > 10 || dy < 0) {
            armed.current = false;
          }
          return;
        }
        pulling.current = true;
      }

      const distance = resistedPullDistance(dy);
      if (distance > 0) {
        if (event.cancelable) {
          event.preventDefault();
        }
        const capped = Math.min(distance, thresholdPx * 1.35);
        distanceRef.current = capped;
        setPullDistance(capped);
      }
    };

    const onTouchEnd = () => {
      if (!armed.current) {
        return;
      }
      const distance = distanceRef.current;
      const shouldRefresh = distance >= thresholdPx && !refreshingRef.current;
      armed.current = false;
      pulling.current = false;

      if (!shouldRefresh) {
        distanceRef.current = 0;
        setPullDistance(0);
        return;
      }

      setRefreshing(true);
      refreshingRef.current = true;
      setPullDistance(thresholdPx * 0.6);
      void (async () => {
        try {
          await onRefreshRef.current();
        } finally {
          refreshingRef.current = false;
          setRefreshing(false);
          distanceRef.current = 0;
          setPullDistance(0);
        }
      })();
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', resetGesture);

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', resetGesture);
    };
  }, [active, thresholdPx]);

  return {
    isRefreshing: refreshing,
    pullDistance,
    status,
  };
}
