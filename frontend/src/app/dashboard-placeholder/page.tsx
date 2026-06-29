'use client';

import { useAuth } from '@/lib/auth';
import { Loader } from '@/components/ui/loader';

export default function DashboardPlaceholderPage() {
  const { user, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader size={24} color="#a3a3a3" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome{user?.email ? `, ${user.email}` : ''}
        </h1>
        <p className="text-sm text-muted-foreground">
          You are signed in. The dashboard is under construction.
        </p>
        <div className="flex justify-center gap-4">
          <a
            href="/ops"
            className="rounded-md bg-blue-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700/80"
          >
            Go to Ops
          </a>
          <button
            onClick={signOut}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
