'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/design/page-header';
import { EmptyState } from '@/components/design/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchBusiness } from '@/lib/founder';

export default function EditBusinessPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [business, setBusiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetchBusiness(id);
        setBusiness(res.data);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (error || !business) {
    return (
      <EmptyState icon={AlertTriangle} title="Cannot load business" description={error ?? undefined} />
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Editing: ${business.name}`}
        description="Business settings — expanded editing coming soon."
      >
        <Link href={`/ops/businesses/${id}`}>
          <Button size="sm" variant="outline"><ArrowLeft className="h-3.5 w-3.5" /> Back</Button>
        </Link>
      </PageHeader>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Business Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Business Name</label>
              <Input defaultValue={business.name} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Slug</label>
              <Input defaultValue={business.slug} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <Input defaultValue={business.email ?? ''} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Phone</label>
              <Input defaultValue={business.phone ?? ''} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Full service/FAQ/hour editing will be available here. For now, use the onboarding wizard to republish with updates.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
