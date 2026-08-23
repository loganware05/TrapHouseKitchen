import { useState } from 'react';
import { Timer, Pencil } from 'lucide-react';
import { Order } from '../../types';

type PrepTimeEditorProps = {
  order: Order;
  onSave: (orderId: string, prepTimeMinutes: number) => void;
  isSaving?: boolean;
};

export default function PrepTimeEditor({ order, onSave, isSaving }: PrepTimeEditorProps) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(order.prepTime ?? 30));

  const sourceLabel =
    order.prepTimeSource === 'CHEF_OVERRIDE' ? 'Chef override' : 'Auto estimate';

  const handleSave = () => {
    const minutes = parseInt(value, 10);
    if (!Number.isFinite(minutes) || minutes < 15 || minutes > 120) {
      return;
    }
    onSave(order.id, minutes);
    setEditing(false);
  };

  return (
    <div
      className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg"
      data-testid={`prep-time-editor-${order.orderNumber}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm text-slate-700">
          <Timer className="h-4 w-4 shrink-0 text-slate-500" />
          <span>
            Customer ETA:{' '}
            <strong className="text-slate-900">{order.prepTime ?? '—'} min</strong>
          </span>
          <span className="text-xs text-slate-500">({sourceLabel})</span>
        </div>
        {!editing ? (
          <button
            type="button"
            onClick={() => {
              setValue(String(order.prepTime ?? 30));
              setEditing(true);
            }}
            className="text-sm text-primary-600 hover:text-primary-800 flex items-center gap-1"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        ) : null}
      </div>
      {editing ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            type="number"
            min={15}
            max={120}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="w-24 rounded-md border border-slate-300 px-2 py-1 text-sm"
            aria-label="Prep time minutes"
          />
          <span className="text-sm text-slate-600">minutes</span>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-3 py-1 text-sm bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="px-3 py-1 text-sm text-slate-600 hover:text-slate-900"
          >
            Cancel
          </button>
        </div>
      ) : null}
    </div>
  );
}
