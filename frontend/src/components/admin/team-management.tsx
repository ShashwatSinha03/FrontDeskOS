'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';
import { Loader } from '@/components/ui/loader';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

interface StaffMember {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  role: string;
  status: string;
  created_at: string;
}

async function getToken(): Promise<string | null> {
  const { createClient } = await import('@/lib/supabase/client');
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  return res.json();
}

export function TeamManagement({ readOnly }: { readOnly: boolean }) {
  const { user } = useAuth();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviting, setInviting] = useState(false);

  const loadTeam = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await getToken();
      if (!token) { setLoading(false); return; }
      const res = await apiFetch(`${API_URL}/team`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.success) {
        setStaff(res.data);
      } else {
        setError(res.error || 'Failed to load team');
      }
    } catch {
      setError('Failed to load team');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTeam();
  }, [loadTeam, user]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail) return;
    setInviting(true);
    setMsg('');
    setError('');
    try {
      const token = await getToken();
      if (!token) return;
      const res = await apiFetch(`${API_URL}/team/invite`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: inviteEmail, name: inviteName, role: 'staff' }),
      });
      if (res.success) {
        setMsg(`Invited ${inviteEmail}`);
        setInviteEmail('');
        setInviteName('');
        loadTeam();
      } else {
        setError(res.error || 'Failed to invite');
      }
    } catch {
      setError('Failed to invite');
    } finally {
      setInviting(false);
    }
  }

  async function handleAction(id: string, endpoint: string, method: string, body?: Record<string, unknown>) {
    setMsg('');
    setError('');
    try {
      const token = await getToken();
      if (!token) return;
      const res = await apiFetch(`${API_URL}${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.success) {
        setMsg('Action completed.');
        loadTeam();
      } else {
        setError(res.error || 'Action failed');
      }
    } catch {
      setError('Action failed');
    }
  }

  if (!user) return null;

  return (
    <div className="space-y-4">
      {msg && (
        <div className="rounded-md border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400">
          {msg}
        </div>
      )}
      {error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {!readOnly && (
        <form onSubmit={handleInvite} className="flex items-end gap-2 product-card p-4">
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1">Email</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@example.com"
              required
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white placeholder-zinc-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1">Name (optional)</label>
            <input
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white placeholder-zinc-500"
            />
          </div>
          <button
            type="submit"
            disabled={inviting || !inviteEmail}
            className="rounded-md bg-blue-600/80 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-500/80 disabled:opacity-50 transition-opacity"
          >
            {inviting ? 'Inviting...' : 'Invite'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12"><Loader size={32} color="#a3a3a3" /></div>
      ) : staff.length === 0 ? (
        <p className="text-sm text-zinc-400">No team members yet.</p>
      ) : (
        <div className="overflow-x-auto product-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-black/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status</th>
                {!readOnly && <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {staff.map((m) => (
                <tr key={m.id} className="hover:bg-zinc-800/30 transition-colors duration-150">
                  <td className="px-4 py-3 text-sm font-medium text-white">{m.full_name || '-'}</td>
                  <td className="px-4 py-3 text-sm text-zinc-400">{m.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      m.role === 'owner' ? 'border-blue-500/20 bg-blue-500/10 text-blue-400' : 'border-zinc-700 bg-zinc-800 text-zinc-300'
                    }`}>
                      {m.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                      m.status === 'active' ? 'border-green-500/20 bg-green-500/10 text-green-400' : m.status === 'invited' ? 'border-yellow-500/20 bg-yellow-500/10 text-yellow-400' : 'border-red-500/20 bg-red-500/10 text-red-400'
                    }`}>
                      {m.status}
                    </span>
                  </td>
                  {!readOnly && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {m.role === 'staff' && (
                          <>
                            {m.status === 'active' ? (
                              <button
                                onClick={() => handleAction(m.id, `/team/${m.id}/status`, 'PATCH', { status: 'suspended' })}
                                className="rounded-md border border-zinc-700 px-2 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors"
                              >
                                Suspend
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAction(m.id, `/team/${m.id}/status`, 'PATCH', { status: 'active' })}
                                className="rounded-md border border-green-500/30 px-2 py-1 text-xs font-medium text-green-400 hover:bg-green-500/10 transition-colors"
                              >
                                Reactivate
                              </button>
                            )}
                            <button
                              onClick={() => handleAction(m.id, `/team/${m.id}/promote`, 'POST')}
                              className="rounded-md border border-blue-500/30 px-2 py-1 text-xs font-medium text-blue-400 hover:bg-blue-500/10 transition-colors"
                            >
                              Promote
                            </button>
                            <button
                              onClick={() => handleAction(m.id, `/team/${m.id}`, 'DELETE')}
                              className="rounded-md border border-red-500/30 px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                              Remove
                            </button>
                          </>
                        )}
                        {m.role === 'owner' && (
                          <span className="text-xs text-zinc-500">-</span>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
