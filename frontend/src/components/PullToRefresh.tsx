import type { ReactNode } from 'react';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import PullToRefreshIndicator from './PullToRefreshIndicator';

type PullToRefreshProps = {
  onRefresh: () => Promise<void>;
  enabled?: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * Wraps page content with touch pull-to-refresh at document scroll top.
 */
export default function PullToRefresh({
  onRefresh,
  enabled = true,
  children,
  className = '',
}: PullToRefreshProps) {
  const { pullDistance, status } = usePullToRefresh({ onRefresh, enabled });

  return (
    <div className={className} data-testid="pull-to-refresh">
      <PullToRefreshIndicator pullDistance={pullDistance} status={status} />
      {children}
    </div>
  );
}
