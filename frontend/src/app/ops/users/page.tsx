'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { founderFetcher, founderUrl } from '@/lib/api/founder';
import { Loader } from '@/components/ui/loader';

const FILTERS = [
  { label: 'All', value: '' },
  { label: 'Owner', value: 'owner' },
  { label: 'Staff', value: 'staff' },
  { label: 'Super Admin', value: 'SUPER_ADMIN' },
];

export default function OpsUsersPage() {
  const [filter, setFilter] = useState('');
  const { data, error, isLoading } = useSWR(
    founderUrl(`/ops/users${filter ? `?role=${filter}` : ''}`),
    founderFetcher,
    { revalidateOnFocus: false }
  );

  const users = data?.success ? data.data : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every user on the platform.
        </p>
      </div>

      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f.value
                ? 'bg-primary/10 text-primary'
                : 'border text-muted-foreground hover:bg-muted'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
          Failed to load users.
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader size={40} color="#a3a3a3" />
        </div>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground">No users found.</p>
      ) : (
        <div className="overflow-x-auto product-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Email</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Business</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((u: any) => (
                <tr key={u.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium">{u.full_name || '-'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.global_role === 'SUPER_ADMIN'
                        ? 'bg-purple-100 text-purple-700'
                        : u.business_role === 'owner'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {u.global_role === 'SUPER_ADMIN' ? 'SUPER_ADMIN' : u.business_role || 'USER'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{u.business_name || '-'}</td>
                  <td className="px-4 py-3">
                    {u.status ? (
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        u.status === 'active'
                          ? 'bg-green-100 text-green-700'
                          : u.status === 'invited'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {u.status}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-xs font-medium text-muted-foreground">
                      View
                    </span>
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
