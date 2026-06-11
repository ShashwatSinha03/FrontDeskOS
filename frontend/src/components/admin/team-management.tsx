'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';

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
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {msg}
        </div>
      )}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {!readOnly && (
        <form onSubmit={handleInvite} className="flex items-end gap-2 rounded-lg border p-4">
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1">Email</label>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@example.com"
              required
              className="w-full rounded-md border px-3 py-1.5 text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium mb-1">Name (optional)</label>
            <input
              type="text"
              value={inviteName}
              onChange={(e) => setInviteName(e.target.value)}
              placeholder="Full name"
              className="w-full rounded-md border px-3 py-1.5 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={inviting || !inviteEmail}
            className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {inviting ? 'Inviting...' : 'Invite'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : staff.length === 0 ? (
        <p className="text-sm text-muted-foreground">No team members yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                {!readOnly && <th className="px-4 py-3 text-right font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {staff.map((m) => (
                <tr key={m.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{m.full_name || '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
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
                  {!readOnly && (
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {m.role === 'staff' && (
                          <>
                            {m.status === 'active' ? (
                              <button
                                onClick={() => handleAction(m.id, `/team/${m.id}/status`, 'PATCH', { status: 'suspended' })}
                                className="rounded-md border px-2 py-1 text-xs font-medium hover:bg-muted transition-colors"
                              >
                                Suspend
                              </button>
                            ) : (
                              <button
                                onClick={() => handleAction(m.id, `/team/${m.id}/status`, 'PATCH', { status: 'active' })}
                                className="rounded-md border border-green-200 px-2 py-1 text-xs font-medium text-green-600 hover:bg-green-50 transition-colors"
                              >
                                Reactivate
                              </button>
                            )}
                            <button
                              onClick={() => handleAction(m.id, `/team/${m.id}/promote`, 'POST')}
                              className="rounded-md border border-blue-200 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              Promote
                            </button>
                            <button
                              onClick={() => handleAction(m.id, `/team/${m.id}`, 'DELETE')}
                              className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors"
                            >
                              Remove
                            </button>
                          </>
                        )}
                        {m.role === 'owner' && (
                          <span className="text-xs text-muted-foreground">-</span>
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
