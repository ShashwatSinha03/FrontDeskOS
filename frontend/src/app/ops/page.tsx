'use client';

import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import { founderFetcher, founderUrl } from '@/lib/api/founder';

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

export default function OpsOverviewPage() {
  const router = useRouter();
  const { data, error, isLoading } = useSWR(
    founderUrl('/ops/overview'),
    founderFetcher,
    { revalidateOnFocus: false }
  );

  const overview = data?.success ? data.data : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          What is happening on your platform.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          Failed to load overview.
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Total Businesses" value={overview?.totalBusinesses ?? '-'} />
          <StatCard label="Total Owners" value={overview?.totalOwners ?? '-'} />
          <StatCard label="Total Staff" value={overview?.totalStaff ?? '-'} />
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg border bg-card">
          <div className="border-b px-5 py-3">
            <h2 className="text-sm font-medium">Recent Businesses</h2>
          </div>
          <div className="divide-y">
            {isLoading ? (
              <div className="p-5 text-sm text-muted-foreground">Loading...</div>
            ) : overview?.recentBusinesses?.length > 0 ? (
              overview.recentBusinesses.map((biz: any) => (
                <div key={biz.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium">{biz.name}</p>
                    <p className="text-xs text-muted-foreground">{biz.owner_name || 'No owner'}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(biz.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-5 text-sm text-muted-foreground">No businesses yet.</div>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card">
          <div className="border-b px-5 py-3">
            <h2 className="text-sm font-medium">Quick Actions</h2>
          </div>
          <div className="space-y-1 p-5">
            <button
              onClick={() => router.push('/ops/onboarding')}
              className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 text-left"
            >
              Launch Onboarding Wizard
            </button>
            <button
              onClick={() => router.push('/ops/businesses')}
              className="w-full rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted text-left"
            >
              View Businesses
            </button>
            <button
              onClick={() => router.push('/ops/users')}
              className="w-full rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted text-left"
            >
              View Users
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
