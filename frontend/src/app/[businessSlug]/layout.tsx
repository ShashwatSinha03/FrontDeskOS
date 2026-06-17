import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { ChatWidget } from '@/components/chat/chat-widget';
import { ChatProvider } from '@/contexts/chat-context';

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

export default async function BusinessLayout({
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
      <div className="flex min-h-screen flex-col items-center justify-center">
        <h1 className="text-2xl font-bold">Business not found</h1>
        <p className="text-muted-foreground mt-2">The business you&apos;re looking for doesn&apos;t exist.</p>
      </div>
    );
  }

  return (
    <ChatProvider businessId={business.id} businessName={business.name}>
      <div className="flex min-h-screen flex-col">
        <Header businessName={business.name} slug={businessSlug} description={business.description} />
        <main className="flex-1">{children}</main>
        <Footer businessName={business.name} slug={businessSlug} />
        <ChatWidget />
      </div>
    </ChatProvider>
  );
}
