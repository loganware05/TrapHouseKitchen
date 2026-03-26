import { OrderStatus } from '../types';
import { Check } from 'lucide-react';

const STEPS: { key: string; label: string }[] = [
  { key: 'received', label: 'Received' },
  { key: 'preparing', label: 'Preparing' },
  { key: 'ready', label: 'Ready' },
  { key: 'pickedup', label: 'Picked up' },
];

const statusStepIndex: Record<Exclude<OrderStatus, 'CANCELLED'>, number> = {
  PENDING: 0,
  PREPARING: 1,
  READY: 2,
  COMPLETED: 3,
};

interface OrderTrackerProps {
  status: OrderStatus;
  className?: string;
}

export default function OrderTracker({ status, className = '' }: OrderTrackerProps) {
  if (status === 'CANCELLED') {
    return (
      <div className={`rounded-th-lg border border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-800 ${className}`}>
        This order was cancelled.
      </div>
    );
  }

  const currentStep = statusStepIndex[status];

  return (
    <div className={className} role="list" aria-label="Order progress">
      <div className="flex items-start justify-between gap-1">
        {STEPS.map((step, index) => {
          const done = index < currentStep;
          const current = index === currentStep;
          return (
            <div key={step.key} className="flex flex-1 flex-col items-center min-w-0" role="listitem">
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  done
                    ? 'bg-primary-600 text-white'
                    : current
                      ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-500 ring-offset-2'
                      : 'bg-th-muted text-th-muted-fg'
                }`}
                aria-current={current ? 'step' : undefined}
              >
                {done ? <Check className="h-4 w-4" strokeWidth={3} /> : index + 1}
              </div>
              <span
                className={`mt-2 text-center text-xs font-medium leading-tight ${
                  current ? 'text-gray-900' : done ? 'text-gray-600' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 h-1 w-full rounded-full bg-th-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary-500 transition-all duration-500"
          style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  );
}
