import { redirect } from 'next/navigation';
import { FounderSidebar } from '@/components/founder/sidebar';
import { createClient } from '@/lib/supabase/server';

async function checkSuperAdmin(accessToken: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  try {
    const res = await fetch(`${apiUrl}/me/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      next: { revalidate: 0 },
    });
    const json = await res.json();
    if (json.success && json.data) return json.data.global_role === 'SUPER_ADMIN';
    return false;
  } catch {
    return false;
  }
}

export default async function OpsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login?redirectTo=/ops');
  }

  const isSuperAdmin = await checkSuperAdmin(session.access_token);

  if (!isSuperAdmin) {
    redirect('/unauthorized');
  }

  return (
    <div className="flex min-h-screen bg-background">
      <FounderSidebar />
      <main className="flex-1 overflow-auto bg-secondary/30">
        <div className="mx-auto max-w-6xl px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
