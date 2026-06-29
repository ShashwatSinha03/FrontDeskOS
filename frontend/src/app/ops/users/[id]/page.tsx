'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { founderFetcher, founderUrl } from '@/lib/api/founder';
import { ArrowLeft } from 'lucide-react';
import { Loader } from '@/components/ui/loader';

export default function OpsUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMsg, setActionMsg] = useState('');
  const [actionError, setActionError] = useState('');
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferBusinessId, setTransferBusinessId] = useState('');
  const [transferNewOwnerId, setTransferNewOwnerId] = useState('');
  const [showRemoveMembership, setShowRemoveMembership] = useState(false);
  const [removeBusinessId, setRemoveBusinessId] = useState('');

  useEffect(() => {
    loadUser();
  }, [id]);

  async function loadUser() {
    setLoading(true);
    setError('');
    try {
      const res = await founderFetcher(founderUrl(`/ops/users/${id}`));
      if (res.success) {
        setData(res.data);
      } else {
        setError(res.error || 'Failed to load user');
      }
    } catch {
      setError('Failed to load user');
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(endpoint: string, body: Record<string, unknown>) {
    setActionMsg('');
    setActionError('');
    try {
      const res = await founderFetcher(founderUrl(endpoint), {
        method: endpoint.includes('reset-password') ? 'POST' : endpoint.includes('membership') ? 'DELETE' : 'PATCH',
        body: JSON.stringify(body),
      });
      if (res.success) {
        setActionMsg('Action completed successfully.');
        loadUser();
      } else {
        setActionError(res.error || 'Action failed');
      }
    } catch {
      setActionError('Action failed');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader size={40} color="#a3a3a3" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link href="/ops/users" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Users
        </Link>
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error || 'User not found'}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link href="/ops/users" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Users
      </Link>

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{data.full_name || 'Unnamed User'}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{data.email}</p>
      </div>

      {actionMsg && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {actionMsg}
        </div>
      )}
      {actionError && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {actionError}
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-lg bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Details</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">ID</dt>
              <dd className="font-mono text-xs">{data.id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Global Role</dt>
              <dd>
                <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  data.global_role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-700'
                }`}>
                  {data.global_role || 'USER'}
                </span>
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Created</dt>
              <dd>{new Date(data.created_at).toLocaleDateString()}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg bg-card p-4">
          <h2 className="mb-3 text-sm font-semibold">Actions</h2>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleAction(`/ops/users/${id}/reset-password`, {})}
              className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
            >
              Reset Password
            </button>
            <button
              onClick={() => handleAction(`/ops/users/${id}/status`, { status: 'suspended' })}
              className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              Suspend
            </button>
            <button
              onClick={() => handleAction(`/ops/users/${id}/status`, { status: 'active' })}
              className="rounded-md border border-green-200 px-3 py-1.5 text-xs font-medium text-green-600 hover:bg-green-50 transition-colors"
            >
              Reactivate
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-card">
        <div className="px-4 py-3">
          <h2 className="text-sm font-semibold">Memberships ({data.memberships?.length || 0})</h2>
        </div>
        {data.memberships?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Business</th>
                  <th className="px-4 py-3 text-left font-medium">Role</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Since</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data.memberships.map((m: any) => (
                  <tr key={m.profile_id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      <Link href={`/ops/businesses/${m.business_id}`} className="text-primary hover:underline">
                        {m.business_name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        m.role === 'owner' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {m.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        m.status === 'active' ? 'bg-green-100 text-green-700' : m.status === 'invited' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {m.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(m.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 text-sm text-muted-foreground">No business memberships.</div>
        )}
      </div>

      <div className="rounded-lg bg-card p-4">
        <h2 className="mb-3 text-sm font-semibold">Danger Zone</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setShowTransfer(!showTransfer); setShowRemoveMembership(false); }}
            className="rounded-md border border-orange-200 px-3 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 transition-colors"
          >
            Transfer Ownership
          </button>
          <button
            onClick={() => { setShowRemoveMembership(!showRemoveMembership); setShowTransfer(false); }}
            className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
          >
            Remove Membership
          </button>
        </div>

        {showTransfer && (
          <div className="mt-3 space-y-2 rounded-md border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Transfer ownership of a business to a different user.</p>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium mb-1">Business ID</label>
                <input
                  type="text"
                  value={transferBusinessId}
                  onChange={(e) => setTransferBusinessId(e.target.value)}
                  placeholder="Business ID"
                  className="w-full rounded-md border px-2 py-1 text-xs"
                />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium mb-1">New Owner User ID</label>
                <input
                  type="text"
                  value={transferNewOwnerId}
                  onChange={(e) => setTransferNewOwnerId(e.target.value)}
                  placeholder="New owner user ID"
                  className="w-full rounded-md border px-2 py-1 text-xs"
                />
              </div>
              <button
                onClick={() => {
                  handleAction(`/ops/users/${id}/transfer-ownership`, {
                    businessId: transferBusinessId,
                    newOwnerId: transferNewOwnerId,
                  });
                  setShowTransfer(false);
                }}
                disabled={!transferBusinessId || !transferNewOwnerId}
                className="self-end rounded-md bg-orange-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700/80 disabled:opacity-50 transition-colors"
              >
                Transfer
              </button>
            </div>
          </div>
        )}

        {showRemoveMembership && (
          <div className="mt-3 space-y-2 rounded-md border bg-muted/30 p-3">
            <p className="text-xs text-muted-foreground">Remove this user from a business (staff only).</p>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium mb-1">Business ID</label>
                <input
                  type="text"
                  value={removeBusinessId}
                  onChange={(e) => setRemoveBusinessId(e.target.value)}
                  placeholder="Business ID"
                  className="w-full rounded-md border px-2 py-1 text-xs"
                />
              </div>
              <button
                onClick={() => {
                  handleAction(`/ops/users/${id}/membership`, {
                    businessId: removeBusinessId,
                  });
                  setShowRemoveMembership(false);
                }}
                disabled={!removeBusinessId}
                className="self-end rounded-md bg-red-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700/80 disabled:opacity-50 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
