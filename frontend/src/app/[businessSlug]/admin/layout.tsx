import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/sidebar';
import { MobileSidebar } from '@/components/admin/mobile-sidebar';
import { NotificationBell } from '@/components/admin/notification-bell';
import { createClient } from '@/lib/supabase/server';

async function getBusiness(slug: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  try {
    const res = await fetch(`${apiUrl}/public/businesses/${slug}`, { next: { revalidate: 60 } });
    const json = await res.json();
    if (json.success) return json.data;
    return null;
  } catch {
    return null;
  }
}

async function getMembership(accessToken: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  try {
    const res = await fetch(`${apiUrl}/me/membership`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      next: { revalidate: 0 },
    });
    const json = await res.json();
    if (json.success) return json.data;
    return null;
  } catch {
    return null;
  }
}

async function getProfile(accessToken: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  try {
    const res = await fetch(`${apiUrl}/me/profile`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      next: { revalidate: 0 },
    });
    const json = await res.json();
    if (json.success && json.data) return json.data;
    return null;
  } catch {
    return null;
  }
}

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ businessSlug: string }>;
}) {
  const { businessSlug } = await params;
  const business = await getBusiness(businessSlug);

  if (!business) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Business not found.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect(`/login?redirectTo=/${businessSlug}/admin`);
  }

  const [membership, profile] = await Promise.all([
    getMembership(session.access_token),
    getProfile(session.access_token),
  ]);

  const isSuperAdmin = profile?.global_role === 'SUPER_ADMIN';

  if (!isSuperAdmin && (!membership || membership.businessId !== business.id)) {
    redirect('/unauthorized');
  }

  if (!isSuperAdmin && membership?.businessStatus === 'disabled') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center space-y-3">
          <h1 className="text-xl font-semibold">Business Disabled</h1>
          <p className="text-muted-foreground">This business has been disabled. Contact your founder for more information.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar
        businessName={business.name}
        slug={businessSlug}
      />
      <div className="flex flex-1 flex-col overflow-auto">
        <header className="flex items-center justify-between border-b bg-card px-4 py-2.5 md:justify-end md:px-6">
          <MobileSidebar businessName={business.name} slug={businessSlug} />
          <NotificationBell />
        </header>
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
