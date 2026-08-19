import { cancelAbandonedUnpaidOrders } from '../services/order.service';

const DEFAULT_SWEEP_INTERVAL_MS = 5 * 60 * 1000;

export function startAbandonedOrderCleanup(
  intervalMs: number = DEFAULT_SWEEP_INTERVAL_MS
): NodeJS.Timeout {
  const run = () => {
    void cancelAbandonedUnpaidOrders()
      .then((result) => {
        if (result.count > 0) {
          console.log(`🧹 Cancelled ${result.count} abandoned unpaid order(s)`);
        }
      })
      .catch((err) => {
        console.error('Abandoned order cleanup failed:', err);
      });
  };

  run();
  return setInterval(run, intervalMs);
}
