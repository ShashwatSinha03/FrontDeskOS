'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { fetchPublicBusiness, updateCustomerLifecycle } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { StatusBadge, lifecycleLevel } from '@/components/design/status-badge';
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
            <StatusBadge level={lifecycleLevel(previousState)}>{previousState}</StatusBadge>
            <span className="mx-1">→</span>
          </span>
        )}
        <Button
          variant="ghost" size="sm"
          onClick={() => { setSelectedState(currentState); setIsEditing(true); }}
        >
          Edit Lifecycle
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <select
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          className="flex h-8 rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {ALLOWED_STATES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <Button
          size="sm"
          onClick={() => setShowConfirm(true)}
          disabled={selectedState === currentState || saving}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
        <Button
          variant="ghost" size="sm"
          onClick={() => setIsEditing(false)}
        >
          Cancel
        </Button>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="rounded-xl bg-card p-6 shadow-lg max-w-sm mx-4 border">
            <h3 className="font-semibold mb-2">Change Lifecycle State</h3>
            <p className="text-sm text-muted-foreground mb-1">
              Current: <StatusBadge level={lifecycleLevel(currentState)}>{currentState}</StatusBadge>
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              New: <StatusBadge level={lifecycleLevel(selectedState)}>{selectedState}</StatusBadge>
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={() => setShowConfirm(false)}>Cancel</Button>
              <Button size="sm" onClick={handleSave}>Confirm</Button>
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
