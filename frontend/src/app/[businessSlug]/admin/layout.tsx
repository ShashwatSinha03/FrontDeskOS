import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/sidebar';
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

  const membership = await getMembership(session.access_token);

  if (!membership || membership.businessId !== business.id) {
    redirect('/unauthorized');
  }

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar
        businessName={business.name}
        slug={businessSlug}
      />
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-7xl px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
