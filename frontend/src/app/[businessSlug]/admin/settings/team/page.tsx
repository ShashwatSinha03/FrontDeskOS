'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

type TeamMember = {
  id: string;
  user_id: string;
  business_id: string;
  role: string;
  full_name: string;
  status: string;
  invited_by: string | null;
  invited_at: string | null;
  accepted_at: string | null;
  created_at: string;
  email: string;
  profile_name: string;
};

export default function TeamPage() {
  const params = useParams();
  const businessSlug = params.businessSlug as string;
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('staff');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    setLoading(true);
    setError(null);
    try {
      const businessRes = await fetch(`/api/public/businesses/${businessSlug}`);
      const businessJson = await businessRes.json();
      if (!businessJson.success) {
        setError('Business not found');
        setLoading(false);
        return;
      }
      const businessId = businessJson.data.id;

      const res = await fetch(`/api/admin/team?businessId=${businessId}`);
      const json = await res.json();
      if (json.success) setMembers(json.data);
      else setError(json.error || 'Failed to load team');
    } catch {
      setError('Failed to load team');
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setError(null);

    try {
      const businessRes = await fetch(`/api/public/businesses/${businessSlug}`);
      const businessJson = await businessRes.json();
      if (!businessJson.success) {
        setError('Business not found');
        setInviting(false);
        return;
      }
      const businessId = businessJson.data.id;

      const res = await fetch('/api/admin/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, email: inviteEmail, name: inviteName, role: inviteRole }),
      });
      const json = await res.json();

      if (json.success) {
        setMembers((prev) => [json.data, ...prev]);
        setShowInvite(false);
        setInviteEmail('');
        setInviteName('');
        setInviteRole('staff');
      } else {
        setError(json.error || 'Failed to invite');
      }
    } catch {
      setError('Failed to invite');
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm('Remove this team member?')) return;
    try {
      const res = await fetch(`/api/admin/team/${memberId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) setMembers((prev) => prev.filter((m) => m.id !== memberId));
      else setError(json.error || 'Failed to remove');
    } catch {
      setError('Failed to remove');
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <div className="text-sm text-muted-foreground">Loading team...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Team</h1>
        <button
          onClick={() => setShowInvite(true)}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Invite Staff
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</div>
      )}

      {showInvite && (
        <div className="rounded-lg border p-4">
          <h2 className="mb-4 text-sm font-semibold">Invite Team Member</h2>
          <form onSubmit={handleInvite} className="space-y-3">
            <div>
              <label className="text-sm font-medium">Email</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Name</label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="mt-1 block w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={inviting}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {inviting ? 'Sending invite...' : 'Send Invite'}
              </button>
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No team members.</td>
              </tr>
            )}
            {members.map((member) => (
              <tr key={member.id} className="border-b last:border-0">
                <td className="px-4 py-3">{member.profile_name || member.full_name || '-'}</td>
                <td className="px-4 py-3">{member.email}</td>
                <td className="px-4 py-3">
                  <span className="capitalize">{member.role}</span>
                </td>
                <td className="px-4 py-3">
                  {member.status === 'accepted' ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">Active</span>
                  ) : member.status === 'pending' ? (
                    <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300">Pending</span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900 dark:text-red-300">Suspended</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleRemove(member.id)}
                    className="text-sm text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
