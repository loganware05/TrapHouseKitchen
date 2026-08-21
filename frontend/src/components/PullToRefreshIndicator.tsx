import { Loader2 } from 'lucide-react';
import type { PullStatus } from '../lib/pullToRefreshLogic';

type PullToRefreshIndicatorProps = {
  pullDistance: number;
  status: PullStatus;
  thresholdPx?: number;
};

/**
 * Decorative pull indicator — not focusable (touch gesture only).
 */
export default function PullToRefreshIndicator({
  pullDistance,
  status,
  thresholdPx = 72,
}: PullToRefreshIndicatorProps) {
  if (status === 'idle' && pullDistance <= 0) {
    return null;
  }

  const progress = Math.min(1, pullDistance / thresholdPx);
  const label =
    status === 'refreshing'
      ? 'Refreshing'
      : status === 'ready'
        ? 'Release to refresh'
        : 'Pull to refresh';

  return (
    <div
      className="pointer-events-none flex items-center justify-center overflow-hidden transition-[height] duration-150 ease-out"
      style={{ height: Math.max(pullDistance, status === 'refreshing' ? 40 : 0) }}
      aria-hidden={status !== 'refreshing'}
      role={status === 'refreshing' ? 'status' : undefined}
      aria-live={status === 'refreshing' ? 'polite' : undefined}
    >
      <div
        className="flex items-center gap-2 text-xs font-medium text-th-muted-fg"
        style={{ opacity: Math.max(0.35, progress) }}
      >
        <Loader2
          className={`h-4 w-4 text-primary-600 ${status === 'refreshing' ? 'animate-spin' : ''}`}
          style={
            status === 'refreshing'
              ? undefined
              : { transform: `rotate(${progress * 180}deg)` }
          }
          aria-hidden
        />
        <span>{label}</span>
      </div>
    </div>
  );
}
