'use client';

import { useEffect, useState, useCallback } from 'react';
import { CreditCard, AlertTriangle, Plus } from 'lucide-react';
import { PageHeader } from '@/components/design/page-header';
import { StatusBadge } from '@/components/design/status-badge';
import { DataTable } from '@/components/admin/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { fetchSubscriptions, createSubscription, FounderSubscription } from '@/lib/founder';

const PLAN_NAMES = ['Starter', 'Growth', 'Pro', 'Custom'];

export default function SubscriptionsPage() {
  const [data, setData] = useState<FounderSubscription[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ businessId: '', planName: 'Starter', planType: 'starter', amount: 0, billingCycle: 'monthly' as 'monthly' | 'yearly' });
  const [creating, setCreating] = useState(false);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchSubscriptions({ page, limit });
      setData(res.data);
      setTotal(res.total);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await createSubscription(form);
      setShowCreate(false);
      setForm({ businessId: '', planName: 'Starter', planType: 'starter', amount: 0, billingCycle: 'monthly' });
      load();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCreating(false);
    }
  };

  const columns = [
    { key: 'businessName', label: 'Business' },
    { key: 'planName', label: 'Plan', render: (v: string) => <StatusBadge level="purple">{v}</StatusBadge> },
    { key: 'status', label: 'Status', render: (v: string) => (
      <StatusBadge level={v === 'active' ? 'success' : v === 'past_due' ? 'danger' : 'neutral'}>{v}</StatusBadge>
    )},
    { key: 'amount', label: 'Amount', render: (v: number, row: FounderSubscription) => `₹${v.toLocaleString('en-IN')}/${row.billingCycle}` },
    { key: 'billingCycle', label: 'Cycle' },
    { key: 'currentPeriodStart', label: 'Started', render: (v: string) => new Date(v).toLocaleDateString() },
    { key: 'currentPeriodEnd', label: 'Ends', render: (v: string | null) => v ? new Date(v).toLocaleDateString() : '—' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Subscriptions" description={`${total} subscriptions across all businesses`}>
        <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-3.5 w-3.5" /> Add Subscription</Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={data}
        totalCount={total}
        page={page}
        limit={limit}
        onPageChange={setPage}
        isLoading={loading}
        error={error}
        onRetry={load}
      />

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Subscription</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Business ID</label>
              <Input
                value={form.businessId}
                onChange={(e) => setForm(f => ({ ...f, businessId: e.target.value }))}
                placeholder="UUID of the business"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Plan</label>
              <Select
                value={form.planName}
                onChange={(e) => setForm(f => ({ ...f, planName: e.target.value, planType: e.target.value.toLowerCase() }))}
              >
                {PLAN_NAMES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Amount (₹)</label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) => setForm(f => ({ ...f, amount: Number(e.target.value) }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Billing Cycle</label>
              <Select
                value={form.billingCycle}
                onChange={(e) => setForm(f => ({ ...f, billingCycle: e.target.value as 'monthly' | 'yearly' }))}
              >
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !form.businessId}>
              {creating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
