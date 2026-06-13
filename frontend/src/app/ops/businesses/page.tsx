'use client';

import { useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { Copy, ExternalLink, Eye, Pencil, Shield } from 'lucide-react';
import { founderFetcher, founderUrl } from '@/lib/api/founder';

export default function OpsBusinessesPage() {
  const [search, setSearch] = useState('');
  const { data, error, isLoading } = useSWR(
    founderUrl(`/ops/businesses${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    founderFetcher,
    { revalidateOnFocus: false }
  );

  const businesses = data?.success ? data.data : [];

  const copyUrl = (slug: string) => {
    navigator.clipboard.writeText(`https://nevuraos.vercel.app/${slug}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Businesses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every business on the platform.
        </p>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, slug, or owner email..."
        className="block w-full max-w-md rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          Failed to load businesses.
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
          ))}
        </div>
      ) : businesses.length === 0 ? (
        <p className="text-sm text-muted-foreground">No businesses found.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">Business</th>
                <th className="px-4 py-3 text-left font-medium">Slug</th>
                <th className="px-4 py-3 text-left font-medium">Owner</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Created</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {businesses.map((biz: any) => (
                <tr key={biz.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{biz.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{biz.slug}</td>
                  <td className="px-4 py-3 text-muted-foreground">{biz.owner_name || biz.owner_email || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      biz.status === 'disabled'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {biz.status || 'active'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(biz.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/ops/businesses/${biz.id}`}
                        className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                      >
                        <Eye className="h-3 w-3" />
                        View
                      </Link>
                      <Link
                        href={`/ops/businesses/${biz.id}/edit`}
                        className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </Link>
                      <Link
                        href={`/${biz.slug}/admin`}
                        className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                      >
                        <Shield className="h-3 w-3" />
                        Admin
                      </Link>
                      <Link
                        href={`/${biz.slug}`}
                        className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                      >
                        <ExternalLink className="h-3 w-3" />
                        Site
                      </Link>
                      <button
                        onClick={() => copyUrl(biz.slug)}
                        className="inline-flex items-center gap-1 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted"
                      >
                        <Copy className="h-3 w-3" />
                        Copy
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
