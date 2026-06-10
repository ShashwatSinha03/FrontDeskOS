'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { fetchPublicBusiness, createLead } from '@/lib/api';

export function AddLeadDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const params = useParams();
  const slug = params.businessSlug as string;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: bizData } = useSWR(slug ? `al-biz-${slug}` : null, () =>
    fetchPublicBusiness(slug), { revalidateOnFocus: false }
  );
  const businessId = bizData?.success && bizData.data ? bizData.data.id : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await createLead({ businessId, name: name.trim(), email: email.trim() || null, phone: phone.trim() || null });
      if (res.success) {
        setName(''); setEmail(''); setPhone('');
        onSuccess();
        onClose();
      } else {
        setError(res.error || 'Failed to create lead');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="rounded-lg bg-white p-6 shadow-lg max-w-md w-full mx-4">
        <h2 className="text-lg font-semibold mb-4">Add New Lead</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Name *" required
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email" type="email"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <input
            value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="rounded border px-3 py-1.5 text-sm hover:bg-muted">Cancel</button>
            <button type="submit" disabled={saving || !name.trim()} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Lead'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
