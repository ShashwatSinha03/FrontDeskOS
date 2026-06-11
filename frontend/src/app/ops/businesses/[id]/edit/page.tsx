'use client';

import { use, useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import useSWR, { useSWRConfig } from 'swr';
import { ArrowLeft } from 'lucide-react';
import { founderFetcher, founderUrl } from '@/lib/api/founder';

export default function EditBusinessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { mutate } = useSWRConfig();

  const { data, error, isLoading } = useSWR(
    founderUrl(`/ops/businesses/${id}`),
    founderFetcher,
    { revalidateOnFocus: false }
  );

  const biz = data?.success ? data.data : null;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saved, setSaved] = useState(false);

  // Assign owner state
  const [ownerEmail, setOwnerEmail] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [assignSuccess, setAssignSuccess] = useState(false);

  if (biz && !name && !email && !phone && !description) {
    setName(biz.name || '');
    setEmail(biz.email || '');
    setPhone(biz.phone || '');
    setDescription(biz.description || '');
  }

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveError('');
    setSaved(false);

    const res = await founderFetcher(founderUrl(`/ops/businesses/${id}`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, phone, description }),
    });

    if (res.success) {
      setSaved(true);
      mutate(founderUrl(`/ops/businesses/${id}`));
    } else {
      setSaveError(res.error || 'Failed to save');
    }

    setSaving(false);
  };

  const handleAssignOwner = async (e: FormEvent) => {
    e.preventDefault();
    setAssigning(true);
    setAssignError('');
    setAssignSuccess(false);

    const res = await founderFetcher(founderUrl(`/ops/businesses/${id}/assign-owner`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: ownerEmail, name: ownerName }),
    });

    if (res.success) {
      setAssignSuccess(true);
      setOwnerEmail('');
      setOwnerName('');
      mutate(founderUrl(`/ops/businesses/${id}`));
    } else {
      setAssignError(res.error || 'Failed to assign owner');
    }

    setAssigning(false);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  if (error || !biz) {
    return (
      <div className="space-y-4">
        <button onClick={() => router.back()} className="rounded-md border p-1.5 hover:bg-muted">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <p className="text-sm text-muted-foreground">Business not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="rounded-md border p-1.5 hover:bg-muted">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Edit Business</h1>
          <p className="text-sm text-muted-foreground">{biz.name} ({biz.slug})</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="rounded-lg border bg-card">
        <div className="border-b px-5 py-3">
          <h2 className="text-sm font-medium">Business Details</h2>
        </div>
        <div className="space-y-4 p-5">
          {saveError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {saveError}
            </div>
          )}
          {saved && (
            <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-600">
              Business updated successfully.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>

      <div className="rounded-lg border bg-card">
        <div className="border-b px-5 py-3">
          <h2 className="text-sm font-medium">
            Assign Owner {biz.owner_name ? `(Current: ${biz.owner_name})` : ''}
          </h2>
        </div>
        <form onSubmit={handleAssignOwner} className="space-y-4 p-5">
          {assignError && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
              {assignError}
            </div>
          )}
          {assignSuccess && (
            <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-600">
              Owner assigned successfully.
            </div>
          )}

          <div>
            <label className="block text-sm font-medium">Owner Email</label>
            <input
              type="email"
              required
              value={ownerEmail}
              onChange={(e) => setOwnerEmail(e.target.value)}
              placeholder="newowner@example.com"
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Owner Name</label>
            <input
              type="text"
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Full name"
              className="mt-1 block w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <button
            type="submit"
            disabled={assigning}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {assigning ? 'Assigning...' : 'Assign Owner'}
          </button>
        </form>
      </div>
    </div>
  );
}
