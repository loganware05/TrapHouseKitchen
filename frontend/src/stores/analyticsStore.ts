import api from '../lib/api';

const SESSION_KEY = 'thk_analytics_session';
const FLUSH_MS = 5000;
const MAX_QUEUE = 80;

type QueuedEvent = {
  event: string;
  metadata?: Record<string, unknown>;
  sessionId?: string;
};

function getSessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `fallback-${Date.now()}`;
  }
}

const queue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function scheduleFlush() {
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
  }
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushAnalytics();
  }, FLUSH_MS);
}

/**
 * Queue an analytics event; batches are sent every few seconds and on route changes.
 */
export function trackEvent(event: string, metadata?: Record<string, unknown>) {
  if (!event || queue.length >= MAX_QUEUE) {
    if (queue.length >= MAX_QUEUE) {
      void flushAnalytics();
    }
    if (!event) return;
  }
  queue.push({
    event,
    metadata,
    sessionId: getSessionId(),
  });
  if (queue.length >= MAX_QUEUE) {
    void flushAnalytics();
    return;
  }
  scheduleFlush();
}

const ORDER_TRACK_PREFIX = 'thk_order_placed_';

/** Avoid duplicate `order_placed` when both inline success and Stripe return paths run. */
export function trackOrderPlacedOnce(
  orderId: string,
  metadata?: Record<string, unknown>
) {
  try {
    const key = ORDER_TRACK_PREFIX + orderId;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, '1');
  } catch {
    // ignore
  }
  trackEvent('order_placed', { orderId, ...metadata });
}

export async function flushAnalytics(): Promise<void> {
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (queue.length === 0) return;

  const batch = queue.splice(0, queue.length);
  const sessionId = getSessionId();

  try {
    await api.post('/analytics/events', {
      sessionId,
      events: batch.map(({ event, metadata, sessionId: sid }) => ({
        event,
        ...(metadata ? { metadata } : {}),
        ...(sid ? { sessionId: sid } : {}),
      })),
    });
  } catch {
    // Best-effort: drop batch on failure to avoid unbounded growth
  }
}

export function initAnalyticsFlushListeners() {
  if (typeof window === 'undefined') return;

  const onHide = () => {
    void flushAnalytics();
  };

  window.addEventListener('pagehide', onHide);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      void flushAnalytics();
    }
  });
}
