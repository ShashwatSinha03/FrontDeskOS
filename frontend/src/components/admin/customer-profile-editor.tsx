'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { fetchPublicBusiness, updateCustomerProfile } from '@/lib/api';
import { Pencil } from 'lucide-react';

export function CustomerProfileEditor({
  customerId, name, email, phone, onSave,
}: {
  customerId: string; name: string | null; email: string | null; phone: string | null; onSave: () => void;
}) {
  const params = useParams();
  const slug = params.businessSlug as string;
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(name || '');
  const [editEmail, setEditEmail] = useState(email || '');
  const [editPhone, setEditPhone] = useState(phone || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: bizData } = useSWR(slug ? `cpebiz-${slug}` : null, () =>
    fetchPublicBusiness(slug), { revalidateOnFocus: false }
  );
  const businessId = bizData?.success && bizData.data ? bizData.data.id : null;

  const handleSave = async () => {
    if (!businessId) return;
    if (!editName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await updateCustomerProfile(customerId, {
        businessId,
        name: editName.trim() || undefined,
        email: editEmail.trim() || null,
        phone: editPhone.trim() || null,
      });
      if (res.success) {
        setEditing(false);
        onSave();
      } else {
        setError(res.error || 'Update failed');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  if (!editing) {
    return (
      <button
        onClick={() => { setEditName(name || ''); setEditEmail(email || ''); setEditPhone(phone || ''); setEditing(true); }}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-blue-600"
      >
        <Pencil className="h-3 w-3" /> Edit
      </button>
    );
  }

  return (
    <div className="space-y-2 p-3 rounded-lg border bg-gray-50">
      <div className="grid gap-2 sm:grid-cols-3">
        <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name *" className="rounded border border-input bg-background px-2 py-1 text-sm" />
        <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Email" type="email" className="rounded border border-input bg-background px-2 py-1 text-sm" />
        <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Phone" className="rounded border border-input bg-background px-2 py-1 text-sm" />
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2 justify-end">
        <button onClick={() => setEditing(false)} className="rounded border px-2 py-1 text-xs hover:bg-muted">Cancel</button>
        <button onClick={handleSave} disabled={saving || !editName.trim()} className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
