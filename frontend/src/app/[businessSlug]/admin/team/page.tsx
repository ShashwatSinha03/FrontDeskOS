'use client';

import { TeamManagement } from '@/components/admin/team-management';

export default function AdminTeamPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Team</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Manage staff and owners for this business.
        </p>
      </div>
      <TeamManagement readOnly={false} />
    </div>
  );
}
