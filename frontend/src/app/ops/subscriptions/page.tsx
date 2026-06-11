'use client';

import { useEffect, useState, useCallback } from 'react';
import { CreditCard, AlertTriangle, Plus, ExternalLink, FileText, List } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/design/page-header';
import { StatusBadge } from '@/components/design/status-badge';
import { DataTable } from '@/components/admin/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Card } from '@/components/ui/card';
import {
  fetchSubscriptions,
  createSubscription,
  changeSubscriptionStatus,
  updateBillingNotes,
  fetchSubscriptionEvents,
  FounderSubscription,
  BillingEvent,
} from '@/lib/founder';

const PLAN_NAMES = ['Starter', 'Growth', 'Pro', 'Custom'];
const STATUS_OPTIONS = ['', 'active', 'past_due', 'suspended', 'cancelled'];
const TRANSITION_STATUSES = ['active', 'past_due', 'suspended', 'cancelled'];

function statusLevel(s: string) {
  if (s === 'active') return 'success' as const;
  if (s === 'past_due') return 'warning' as const;
  if (s === 'suspended' || s === 'cancelled') return 'danger' as const;
  return 'neutral' as const;
}

export default function SubscriptionsPage() {
  const [data, setData] = useState<FounderSubscription[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ businessId: '', planName: 'Starter', planType: 'starter', amount: 0, billingCycle: 'monthly' as 'monthly' | 'yearly' });
  const [creating, setCreating] = useState(false);
  const [selectedSub, setSelectedSub] = useState<FounderSubscription | null>(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [statusForm, setStatusForm] = useState({ newStatus: 'active', note: '' });
  const [showNotesDialog, setShowNotesDialog] = useState(false);
  const [notesForm, setNotesForm] = useState({ notes: '' });
  const [showEventsDialog, setShowEventsDialog] = useState(false);
  const [events, setEvents] = useState<BillingEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: { page: number; limit: number; status?: string } = { page, limit };
      if (statusFilter) params.status = statusFilter;
      const res = await fetchSubscriptions(params);
      setData(res.data);
      setTotal(res.total);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { load(); }, [load]);

  // Reset to page 1 when filter changes
  useEffect(() => { setPage(1); }, [statusFilter]);

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

  const handleChangeStatus = async () => {
    if (!selectedSub) return;
    try {
      await changeSubscriptionStatus(selectedSub.id, statusForm.newStatus, statusForm.note || undefined);
      setShowStatusDialog(false);
      setSelectedSub(null);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleUpdateNotes = async () => {
    if (!selectedSub) return;
    try {
      await updateBillingNotes(selectedSub.id, notesForm.notes);
      setShowNotesDialog(false);
      setSelectedSub(null);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleViewEvents = async (sub: FounderSubscription) => {
    setSelectedSub(sub);
    setShowEventsDialog(true);
    setEventsLoading(true);
    try {
      const res = await fetchSubscriptionEvents(sub.id);
      setEvents(res.data);
    } catch (e: any) {
      alert(e.message);
    } finally {
      setEventsLoading(false);
    }
  };

  const columns = [
    {
      key: 'businessName',
      label: 'Business',
      render: (v: string, row: FounderSubscription) => (
        <Link href={`/ops/businesses/${row.businessId}`} className="font-medium hover:text-primary transition-colors">
          {v}
        </Link>
      ),
    },
    { key: 'planName', label: 'Plan', render: (v: string) => <StatusBadge level="purple">{v}</StatusBadge> },
    {
      key: 'status',
      label: 'Status',
      render: (v: string) => (
        <div className="flex items-center gap-2">
          <StatusBadge level={statusLevel(v)}>{v.replace('_', ' ')}</StatusBadge>
          <button
            className="text-xs text-muted-foreground hover:text-primary transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              const row = data.find(s => s.status === v);
              if (row) {
                setSelectedSub(row);
                setStatusForm({ newStatus: row.status, note: '' });
                setShowStatusDialog(true);
              }
            }}
          >
            change
          </button>
        </div>
      ),
    },
    { key: 'amount', label: 'Amount', render: (v: number, row: FounderSubscription) => `₹${v.toLocaleString('en-IN')}/${row.billingCycle}` },
    { key: 'billingCycle', label: 'Cycle' },
    { key: 'currentPeriodStart', label: 'Started', render: (v: string) => new Date(v).toLocaleDateString() },
    { key: 'currentPeriodEnd', label: 'Ends', render: (v: string | null) => v ? new Date(v).toLocaleDateString() : '—' },
    {
      key: 'id',
      label: 'Actions',
      render: (_: string, row: FounderSubscription) => (
        <div className="flex items-center gap-1">
          <button
            className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedSub(row);
              setNotesForm({ notes: '' });
              setShowNotesDialog(true);
            }}
          >
            <FileText className="h-3 w-3" /> Notes
          </button>
          <button
            className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
            onClick={(e) => {
              e.stopPropagation();
              handleViewEvents(row);
            }}
          >
            <List className="h-3 w-3" /> Events
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Subscriptions" description={`${total} subscriptions across all businesses`}>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-36">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="past_due">Past Due</option>
            <option value="suspended">Suspended</option>
            <option value="cancelled">Cancelled</option>
          </Select>
          <Button size="sm" onClick={() => setShowCreate(true)}><Plus className="h-3.5 w-3.5" /> Add</Button>
        </div>
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

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Subscription</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Business ID</label>
              <Input value={form.businessId} onChange={(e) => setForm(f => ({ ...f, businessId: e.target.value }))} placeholder="UUID of the business" />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Plan</label>
              <Select value={form.planName} onChange={(e) => setForm(f => ({ ...f, planName: e.target.value, planType: e.target.value.toLowerCase() }))}>
                {PLAN_NAMES.map((p) => (<option key={p} value={p}>{p}</option>))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Amount (₹)</label>
              <Input type="number" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: Number(e.target.value) }))} />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Billing Cycle</label>
              <Select value={form.billingCycle} onChange={(e) => setForm(f => ({ ...f, billingCycle: e.target.value as 'monthly' | 'yearly' }))}>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !form.businessId}>{creating ? 'Creating...' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Status</DialogTitle></DialogHeader>
          {selectedSub && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                {selectedSub.businessName} &mdash; currently <strong>{selectedSub.status}</strong>
              </p>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">New Status</label>
                <Select value={statusForm.newStatus} onChange={(e) => setStatusForm(f => ({ ...f, newStatus: e.target.value }))}>
                  {TRANSITION_STATUSES.map((s) => (<option key={s} value={s}>{s.replace('_', ' ')}</option>))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Note (optional)</label>
                <Input value={statusForm.note} onChange={(e) => setStatusForm(f => ({ ...f, note: e.target.value }))} placeholder="Reason for change" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>Cancel</Button>
            <Button onClick={handleChangeStatus}>Update Status</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={showNotesDialog} onOpenChange={setShowNotesDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Billing Notes</DialogTitle></DialogHeader>
          {selectedSub && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">{selectedSub.businessName}</p>
              <textarea
                className="w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm"
                rows={5}
                value={notesForm.notes}
                onChange={(e) => setNotesForm({ notes: e.target.value })}
                placeholder="Internal billing notes..."
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNotesDialog(false)}>Cancel</Button>
            <Button onClick={handleUpdateNotes}>Save Notes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Events Dialog */}
      <Dialog open={showEventsDialog} onOpenChange={setShowEventsDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Billing History</DialogTitle></DialogHeader>
          {selectedSub && (
            <div className="py-2 max-h-80 overflow-y-auto space-y-2">
              {eventsLoading ? (
                <p className="text-sm text-muted-foreground">Loading events...</p>
              ) : events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No billing events recorded.</p>
              ) : (
                events.map((event) => (
                  <div key={event.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">{event.event_type.replace(/_/g, ' ')}</span>
                      <time className="text-xs text-muted-foreground">
                        {new Date(event.created_at).toLocaleDateString()}
                      </time>
                    </div>
                    {(event.previous_status || event.new_status) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {event.previous_status} → {event.new_status}
                      </p>
                    )}
                    {event.note && <p className="text-xs text-muted-foreground mt-0.5">{event.note}</p>}
                  </div>
                ))
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEventsDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
