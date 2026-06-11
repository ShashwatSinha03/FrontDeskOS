import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/admin/sidebar';
import { SubscriptionBanner } from '@/components/admin/subscription-banner';

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

async function getBillingInfo(slug: string, token: string) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  try {
    const res = await fetch(`${apiUrl}/admin/settings/billing?slug=${slug}`, {
      headers: { Authorization: `Bearer ${token}` },
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

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    redirect(`/login?redirect=/${businessSlug}/admin`);
  }

  const business = await getBusiness(businessSlug);
  if (!business) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Business not found.</p>
      </div>
    );
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
  const membershipRes = await fetch(
    `${apiUrl}/admin/membership?slug=${businessSlug}`,
    {
      headers: { Authorization: `Bearer ${session.access_token}` },
    }
  );
  const membershipJson = await membershipRes.json();

  if (!membershipJson.success || !membershipJson.data) {
    redirect('/unauthorized');
  }

  const billing = await getBillingInfo(businessSlug, session.access_token);
  const subscriptionStatus = billing?.subscription?.status || 'active';

  return (
    <div className="flex min-h-screen bg-background">
      <AdminSidebar businessName={business.name} slug={businessSlug} />
      <main className="flex-1 overflow-auto">
        <SubscriptionBanner status={subscriptionStatus} />
        <div className="mx-auto max-w-7xl px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
