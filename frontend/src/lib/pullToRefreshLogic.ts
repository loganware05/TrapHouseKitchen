/** Pure helpers for pull-to-refresh (unit-testable without DOM). */

export type PullStatus = 'idle' | 'pulling' | 'ready' | 'refreshing';

export const DEFAULT_PULL_THRESHOLD_PX = 72;
export const PULL_RESISTANCE = 0.45;
/** Ignore mostly-horizontal pans (dish strips / category chips). */
export const VERTICAL_DOMINANCE = 1.2;

export function isVerticalDominantPull(deltaX: number, deltaY: number): boolean {
  return deltaY > 0 && deltaY > Math.abs(deltaX) * VERTICAL_DOMINANCE;
}

export function resistedPullDistance(rawDeltaY: number, resistance = PULL_RESISTANCE): number {
  if (rawDeltaY <= 0) {
    return 0;
  }
  return rawDeltaY * resistance;
}

export function nextPullStatus(
  distance: number,
  threshold: number,
  refreshing: boolean
): PullStatus {
  if (refreshing) {
    return 'refreshing';
  }
  if (distance <= 0) {
    return 'idle';
  }
  if (distance >= threshold) {
    return 'ready';
  }
  return 'pulling';
}

export function shouldStartPull(scrollTop: number, enabled: boolean, refreshing: boolean): boolean {
  return enabled && !refreshing && scrollTop <= 0;
}
