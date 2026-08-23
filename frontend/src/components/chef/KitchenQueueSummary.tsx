import { Clock } from 'lucide-react';

export type PrepIntelligenceData = {
  queue: {
    pending: number;
    preparing: number;
    ready: number;
    queueLoadMinutes: number;
  };
  learning: {
    enabled: boolean;
    active: boolean;
    sampleCount: number;
    minSamples: number;
    globalBiasMinutes: number;
    medianDeltaMinutes: number | null;
    collectingLabel: string;
    dishSuggestions: Array<{
      dishId: string;
      dishName: string;
      currentPrepMinutes: number | null;
      suggestedPrepMinutes: number;
      sampleCount: number;
      medianDeltaMinutes: number;
    }>;
  };
};

type KitchenQueueSummaryProps = {
  data: PrepIntelligenceData;
  compact?: boolean;
};

export default function KitchenQueueSummary({ data, compact }: KitchenQueueSummaryProps) {
  const { queue, learning } = data;

  if (compact) {
    return (
      <div
        className="mb-6 p-4 bg-white rounded-lg shadow-md border border-slate-100"
        data-testid="kitchen-queue-summary"
      >
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="font-medium text-gray-900 flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-primary-600" />
            Kitchen queue
          </span>
          <span>
            Pending: <strong>{queue.pending}</strong>
          </span>
          <span>
            Preparing: <strong>{queue.preparing}</strong>
          </span>
          <span>
            Ready: <strong>{queue.ready}</strong>
          </span>
          <span className="text-primary-700">
            Load: <strong>{queue.queueLoadMinutes} min</strong>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8" data-testid="prep-intelligence-panel">
      <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-primary-600" />
        Prep intelligence
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Pending', value: queue.pending },
          { label: 'Preparing', value: queue.preparing },
          { label: 'Ready', value: queue.ready },
          { label: 'Queue load', value: `${queue.queueLoadMinutes} min` },
        ].map((item) => (
          <div key={item.label} className="rounded-lg bg-slate-50 border border-slate-100 p-3">
            <p className="text-xs text-slate-600">{item.label}</p>
            <p className="text-xl font-bold text-slate-900">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-lg bg-amber-50 border border-amber-100 p-4 mb-4">
        <p className="text-sm font-medium text-amber-900">Learning status</p>
        <p className="text-sm text-amber-800 mt-1">{learning.collectingLabel}</p>
        {learning.active ? (
          <p className="text-xs text-amber-700 mt-2">
            Global bias: {learning.globalBiasMinutes > 0 ? '+' : ''}
            {learning.globalBiasMinutes} min
            {learning.medianDeltaMinutes != null &&
              ` · median delta ${learning.medianDeltaMinutes > 0 ? '+' : ''}${learning.medianDeltaMinutes} min`}
          </p>
        ) : null}
      </div>

      {learning.dishSuggestions.length > 0 ? (
        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Dish prep suggestions</h3>
          <p className="text-xs text-gray-500 mb-3">
            Suggestions only — update dish prep times manually in Menu if you agree.
          </p>
          <ul className="space-y-2">
            {learning.dishSuggestions.slice(0, 5).map((s) => (
              <li
                key={s.dishId}
                className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded-md"
              >
                <span className="font-medium text-gray-900">{s.dishName}</span>
                <span className="text-gray-600">
                  {s.currentPrepMinutes ?? '—'} → {s.suggestedPrepMinutes} min
                  <span className="text-xs text-gray-400 ml-2">({s.sampleCount} samples)</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-gray-500">No dish prep suggestions yet.</p>
      )}
    </div>
  );
}
