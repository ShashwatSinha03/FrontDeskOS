'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { fetchPublicBusiness, updateCustomerLifecycle } from '@/lib/api';
import { CustomerLifecycleState } from '@/types';

const ALLOWED_STATES: CustomerLifecycleState[] = [
  'New Inquiry',
  'Qualified',
  'Booking Opportunity',
  'Booked',
  'Follow-Up Pending',
  'Escalated',
];

export function LifecycleEditor({
  customerId,
  currentState,
  previousState,
  onStateChange,
}: {
  customerId: string;
  currentState: string;
  previousState?: string | null;
  onStateChange: () => void;
}) {
  const params = useParams();
  const slug = params.businessSlug as string;
  const [isEditing, setIsEditing] = useState(false);
  const [selectedState, setSelectedState] = useState(currentState);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: bizData } = useSWR(slug ? `lebiz-${slug}` : null, () =>
    fetchPublicBusiness(slug), { revalidateOnFocus: false }
  );
  const businessId = bizData?.success && bizData.data ? bizData.data.id : null;

  const handleSave = async () => {
    if (!businessId) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await updateCustomerLifecycle(customerId, businessId, selectedState);
      if (res.success) {
        setMessage({ type: 'success', text: `State changed: ${currentState} → ${selectedState}` });
        setIsEditing(false);
        setShowConfirm(false);
        onStateChange();
      } else {
        setMessage({ type: 'error', text: res.error || 'Update failed' });
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' });
    } finally {
      setSaving(false);
    }
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        {previousState && previousState !== currentState && (
          <span className="text-xs text-muted-foreground">
            {previousState} →
          </span>
        )}
        <button
          onClick={() => { setSelectedState(currentState); setIsEditing(true); }}
          className="text-xs text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap"
        >
          Edit Lifecycle
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1 text-xs"
        >
          {ALLOWED_STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <button
          onClick={() => setShowConfirm(true)}
          disabled={selectedState === currentState || saving}
          className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={() => setIsEditing(false)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-lg bg-white p-6 shadow-lg max-w-sm mx-4">
            <h3 className="font-semibold mb-2">Change Lifecycle State</h3>
            <p className="text-sm text-muted-foreground mb-1">
              Current: <strong>{currentState}</strong>
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              New: <strong>{selectedState}</strong>
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowConfirm(false)}
                className="rounded border px-3 py-1.5 text-sm hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {message && (
        <div
          className={`text-xs px-2 py-1 rounded ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}
    </div>
  );
}
