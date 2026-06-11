import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { FounderSidebar } from '@/components/founder/sidebar';

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login?redirect=/ops');
  }

  const meRes = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api'}/me`,
    {
      headers: { Authorization: `Bearer ${session.access_token}` },
    }
  );
  const meJson = await meRes.json();

  if (!meJson.success || meJson.data?.global_role !== 'SUPER_ADMIN') {
    redirect('/unauthorized');
  }

  return (
    <div className="flex min-h-screen">
      <FounderSidebar />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
