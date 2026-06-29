'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import useSWR, { useSWRConfig } from 'swr';
import { ArrowLeft, Copy, ExternalLink, Ban, CheckCircle } from 'lucide-react';
import { founderFetcher, founderUrl } from '@/lib/api/founder';

export default function BusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { mutate } = useSWRConfig();

  const { data, error, isLoading } = useSWR(
    founderUrl(`/ops/businesses/${id}`),
    founderFetcher,
    { revalidateOnFocus: false }
  );

  const biz = data?.success ? data.data : null;

  const copyUrl = (slug: string) => {
    navigator.clipboard.writeText(`https://nuvoraos.vercel.app/${slug}`);
  };

  const toggleStatus = async () => {
    const newStatus = biz.status === 'disabled' ? 'active' : 'disabled';
    const res = await founderFetcher(founderUrl(`/ops/businesses/${id}/status`), {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.success) {
      mutate(founderUrl(`/ops/businesses/${id}`));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="rounded-md border p-1.5 hover:bg-muted">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{biz?.name || 'Business'}</h1>
          <p className="text-sm text-muted-foreground">{biz?.slug}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          Failed to load business.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : !biz ? (
        <p className="text-sm text-muted-foreground">Business not found.</p>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-lg bg-card">
              <div className="px-5 py-3">
                <h2 className="text-sm font-medium">Business Information</h2>
              </div>
              <div className="space-y-3 p-5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{biz.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Slug</span>
                  <span className="font-medium">{biz.slug}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Email</span>
                  <span className="font-medium">{biz.email || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="font-medium">{biz.phone || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Description</span>
                  <span className="max-w-[200px] text-right font-medium truncate">{biz.description || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                    biz.status === 'disabled' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {biz.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-card">
              <div className="px-5 py-3">
                <h2 className="text-sm font-medium">Owner Information</h2>
              </div>
              <div className="space-y-3 p-5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Owner Name</span>
                  <span className="font-medium">{biz.owner_name || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Owner Email</span>
                  <span className="font-medium">{biz.owner_email || '-'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-lg bg-card">
              <div className="px-5 py-3">
                <h2 className="text-sm font-medium">Platform Information</h2>
              </div>
              <div className="space-y-3 p-5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Business ID</span>
                  <span className="font-mono text-xs">{biz.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">{new Date(biz.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-card">
              <div className="px-5 py-3">
                <h2 className="text-sm font-medium">Recent Activity</h2>
              </div>
              <div className="space-y-3 p-5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Leads</span>
                  <span className="font-medium">{biz.recentActivity?.totalLeads ?? '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Appointments (30d)</span>
                  <span className="font-medium">{biz.recentActivity?.recentAppointments ?? '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Escalations (30d)</span>
                  <span className="font-medium">{biz.recentActivity?.recentEscalations ?? '-'}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              href={`/ops/businesses/${id}/edit`}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Edit Business
            </Link>
            <Link
              href={`/${biz.slug}/admin`}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              <ExternalLink className="mr-1.5 inline h-3.5 w-3.5" />
              Open Admin
            </Link>
            <Link
              href={`/${biz.slug}`}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              <ExternalLink className="mr-1.5 inline h-3.5 w-3.5" />
              Open Website
            </Link>
            <button
              onClick={() => copyUrl(biz.slug)}
              className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
            >
              <Copy className="mr-1.5 inline h-3.5 w-3.5" />
              Copy URL
            </button>
            <button
              onClick={toggleStatus}
              className={`rounded-md px-4 py-2 text-sm font-medium text-white ${
                biz.status === 'disabled' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {biz.status === 'disabled' ? (
                <><CheckCircle className="mr-1.5 inline h-3.5 w-3.5" /> Enable Business</>
              ) : (
                <><Ban className="mr-1.5 inline h-3.5 w-3.5" /> Disable Business</>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
