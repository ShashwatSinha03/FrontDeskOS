'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { TeamManagement } from '@/components/admin/team-management';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

type TabId = 'business' | 'services' | 'hours' | 'faqs' | 'ai' | 'team';

const TABS: { id: TabId; label: string }[] = [
  { id: 'business', label: 'Business' },
  { id: 'services', label: 'Services' },
  { id: 'hours', label: 'Hours' },
  { id: 'faqs', label: 'FAQs' },
  { id: 'ai', label: 'AI' },
  { id: 'team', label: 'Team' },
];

async function getToken(): Promise<string | null> {
  const { createClient } = await import('@/lib/supabase/client');
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

function getCurrentSlug(): string | null {
  if (typeof window === 'undefined') return null;
  const match = window.location.pathname.match(/^\/([^/]+)\/admin/);
  return match?.[1] || null;
}

function withSlug(path: string) {
  const slug = getCurrentSlug();
  if (!slug) return path;
  return `${path}${path.includes('?') ? '&' : '?'}slug=${encodeURIComponent(slug)}`;
}

async function apiGet(path: string) {
  const token = await getToken();
  if (!token) throw new Error('No session');
  const res = await fetch(`${API_URL}${withSlug(path)}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
}

async function apiMutate(path: string, method: string, body: unknown) {
  const token = await getToken();
  if (!token) throw new Error('No session');
  const res = await fetch(`${API_URL}${withSlug(path)}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  return res.json();
}

function to12h(time: string) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>('business');
  const [role, setRole] = useState<'owner' | 'staff' | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loadingRole, setLoadingRole] = useState(true);

  const isOwner = role === 'owner';

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) { setLoadingRole(false); return; }
      const res = await apiGet('/me/membership');
      if (res.success && res.data) {
        setRole(res.data.role);
      }
      setLoadingRole(false);
    })();
  }, []);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  const dirtyRef = useRef(false);

  function setDirty() { dirtyRef.current = true; }
  function clearDirty() { dirtyRef.current = false; }

  function handleTabSwitch(tab: TabId) {
    if (dirtyRef.current) {
      if (!window.confirm('You have unsaved changes. Discard them?')) return;
    }
    setError('');
    setMsg('');
    clearDirty();
    setActiveTab(tab);
  }

  if (loadingRole || !user) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your business configuration. {!isOwner && '(View-only)'}
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">{error}</div>
      )}
      {msg && (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">{msg}</div>
      )}

      <div className="flex gap-1 border-b">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => handleTabSwitch(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === t.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'business' && (
        <BusinessTab isOwner={isOwner} onError={setError} onMsg={setMsg} setDirty={setDirty} clearDirty={clearDirty} dirtyRef={dirtyRef} />
      )}
      {activeTab === 'services' && (
        <ServicesTab isOwner={isOwner} onError={setError} onMsg={setMsg} setDirty={setDirty} clearDirty={clearDirty} dirtyRef={dirtyRef} />
      )}
      {activeTab === 'hours' && (
        <HoursTab isOwner={isOwner} onError={setError} onMsg={setMsg} setDirty={setDirty} clearDirty={clearDirty} dirtyRef={dirtyRef} />
      )}
      {activeTab === 'faqs' && (
        <FaqsTab isOwner={isOwner} onError={setError} onMsg={setMsg} setDirty={setDirty} clearDirty={clearDirty} dirtyRef={dirtyRef} />
      )}
      {activeTab === 'ai' && (
        <AiTab isOwner={isOwner} onError={setError} onMsg={setMsg} setDirty={setDirty} clearDirty={clearDirty} dirtyRef={dirtyRef} />
      )}
      {activeTab === 'team' && (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Manage staff and owners for this business.
          </p>
          <TeamManagement readOnly={!isOwner} />
        </div>
      )}
    </div>
  );
}

function BusinessTab({ isOwner, onError, onMsg, setDirty, clearDirty, dirtyRef }: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', description: '' });
  const [savedForm, setSavedForm] = useState({ ...form });

  useEffect(() => {
    (async () => {
      const res = await apiGet('/settings/business');
      if (res.success) {
        setData(res.data);
        setForm(res.data);
        setSavedForm(res.data);
      } else {
        onError(res.error || 'Failed to load');
      }
      setLoading(false);
    })();
  }, []);

  const isDirty = JSON.stringify(form) !== JSON.stringify(savedForm);
  useEffect(() => { if (isDirty) { setDirty(); dirtyRef.current = true; } else { clearDirty(); dirtyRef.current = false; } }, [isDirty]);

  async function handleSave() {
    setSaving(true);
    onError('');
    onMsg('');
    try {
      const res = await apiMutate('/settings/business', 'PATCH', form);
      if (res.success) {
        setSavedForm({ ...form });
        clearDirty();
        dirtyRef.current = false;
        onMsg('Business information saved.');
      } else {
        onError(res.error || 'Failed to save');
      }
    } catch { onError('Failed to save'); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="h-48 animate-pulse rounded-lg bg-muted" />;

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <label className="block text-sm font-medium mb-1">Business Name</label>
        <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          readOnly={!isOwner}
          className="w-full rounded-md border px-3 py-2 text-sm read-only:opacity-60 read-only:cursor-not-allowed" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Email</label>
        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
          readOnly={!isOwner}
          className="w-full rounded-md border px-3 py-2 text-sm read-only:opacity-60 read-only:cursor-not-allowed" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Phone</label>
        <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
          readOnly={!isOwner}
          className="w-full rounded-md border px-3 py-2 text-sm read-only:opacity-60 read-only:cursor-not-allowed" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Address</label>
        <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
          readOnly={!isOwner}
          className="w-full rounded-md border px-3 py-2 text-sm read-only:opacity-60 read-only:cursor-not-allowed" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Description</label>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
          readOnly={!isOwner} rows={3}
          className="w-full rounded-md border px-3 py-2 text-sm read-only:opacity-60 read-only:cursor-not-allowed" />
      </div>
      {isOwner && (
        <button onClick={handleSave} disabled={!isDirty || saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
          {saving ? 'Saving...' : 'Save'}
        </button>
      )}
    </div>
  );
}

function ServicesTab({ isOwner, onError, onMsg, setDirty, clearDirty, dirtyRef }: any) {
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newSvc, setNewSvc] = useState({ name: '', description: '', durationMinutes: 30, price: 0 });
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<any>({});

  const load = useCallback(async () => {
    const res = await apiGet('/settings/services');
    if (res.success) setServices(res.data);
    else onError(res.error || 'Failed to load');
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving('create');
    onError('');
    onMsg('');
    const res = await apiMutate('/settings/services', 'POST', newSvc);
    if (res.success) {
      setShowCreate(false);
      setNewSvc({ name: '', description: '', durationMinutes: 30, price: 0 });
      onMsg('Service created.');
      load();
    } else onError(res.error || 'Failed to create');
    setSaving(null);
  }

  async function handleEdit(id: string) {
    setSaving(id);
    onError('');
    onMsg('');
    const res = await apiMutate(`/settings/services/${id}`, 'PATCH', editForm);
    if (res.success) {
      setEditId(null);
      onMsg('Service updated.');
      load();
    } else onError(res.error || 'Failed to update');
    setSaving(null);
  }

  async function handleToggle(id: string, current: boolean) {
    setSaving(id);
    onError('');
    onMsg('');
    const res = await apiMutate(`/settings/services/${id}/toggle`, 'PATCH', { isActive: !current });
    if (res.success) {
      onMsg(current ? 'Service disabled.' : 'Service enabled.');
      load();
    } else onError(res.error || 'Failed to toggle');
    setSaving(null);
  }

  if (loading) return <div className="h-48 animate-pulse rounded-lg bg-muted" />;

  return (
    <div className="space-y-4">
      {isOwner && (
        <button onClick={() => setShowCreate(!showCreate)}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
          {showCreate ? 'Cancel' : 'Add Service'}
        </button>
      )}

      {showCreate && (
        <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3 rounded-lg border p-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium mb-1">Name *</label>
            <input type="text" value={newSvc.name} onChange={(e) => setNewSvc({ ...newSvc, name: e.target.value })}
              required className="w-full rounded-md border px-2 py-1.5 text-sm" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium mb-1">Description</label>
            <input type="text" value={newSvc.description} onChange={(e) => setNewSvc({ ...newSvc, description: e.target.value })}
              className="w-full rounded-md border px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Duration (min) *</label>
            <input type="number" value={newSvc.durationMinutes} onChange={(e) => setNewSvc({ ...newSvc, durationMinutes: Math.max(1, +e.target.value) })}
              min={1} required className="w-full rounded-md border px-2 py-1.5 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Price ($) *</label>
            <input type="number" value={newSvc.price} onChange={(e) => setNewSvc({ ...newSvc, price: Math.max(0, +e.target.value) })}
              min={0} step="0.01" required className="w-full rounded-md border px-2 py-1.5 text-sm" />
          </div>
          <div className="col-span-2">
            <button type="submit" disabled={saving === 'create' || !newSvc.name}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
              {saving === 'create' ? 'Creating...' : 'Create Service'}
            </button>
          </div>
        </form>
      )}

      {services.length === 0 ? (
        <p className="text-sm text-muted-foreground">No services yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">Name</th>
                <th className="px-4 py-3 text-left font-medium">Duration</th>
                <th className="px-4 py-3 text-left font-medium">Price</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                {isOwner && <th className="px-4 py-3 text-right font-medium">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {services.map((s: any) => (
                <tr key={s.id} className={!s.isActive ? 'opacity-50' : ''}>
                  {editId === s.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full rounded border px-2 py-1 text-xs" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" value={editForm.durationMinutes} onChange={(e) => setEditForm({ ...editForm, durationMinutes: Math.max(1, +e.target.value) })}
                          min={1} className="w-20 rounded border px-2 py-1 text-xs" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: Math.max(0, +e.target.value) })}
                          min={0} step="0.01" className="w-24 rounded border px-2 py-1 text-xs" />
                      </td>
                      <td className="px-4 py-2">{s.isActive ? 'Active' : 'Disabled'}</td>
                      <td className="px-4 py-2 text-right space-x-1">
                        <button onClick={() => handleEdit(s.id)} disabled={saving === s.id}
                          className="rounded border px-2 py-1 text-xs font-medium hover:bg-muted disabled:opacity-50">Save</button>
                        <button onClick={() => setEditId(null)}
                          className="rounded border px-2 py-1 text-xs font-medium hover:bg-muted">Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.durationMinutes} min</td>
                      <td className="px-4 py-3">${s.price.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                          s.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                        }`}>{s.isActive ? 'Active' : 'Disabled'}</span>
                      </td>
                      {isOwner && (
                        <td className="px-4 py-3 text-right space-x-1">
                          <button onClick={() => {
                            setEditId(s.id);
                            setEditForm({ name: s.name, description: s.description, durationMinutes: s.durationMinutes, price: s.price });
                          }}
                            className="rounded border px-2 py-1 text-xs font-medium hover:bg-muted transition-colors">Edit</button>
                          <button onClick={() => handleToggle(s.id, s.isActive)} disabled={saving === s.id}
                            className={`rounded border px-2 py-1 text-xs font-medium transition-colors ${
                              s.isActive ? 'border-orange-200 text-orange-600 hover:bg-orange-50' : 'border-green-200 text-green-600 hover:bg-green-50'
                            } disabled:opacity-50`}>
                            {s.isActive ? 'Disable' : 'Enable'}
                          </button>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function HoursTab({ isOwner, onError, onMsg, setDirty, clearDirty, dirtyRef }: any) {
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const [week, setWeek] = useState<Record<string, { open: boolean; start: string; end: string }>>({});
  const [savedWeek, setSavedWeek] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await apiGet('/settings/hours');
      if (res.success) {
        setWeek(res.data);
        setSavedWeek(JSON.parse(JSON.stringify(res.data)));
      } else onError(res.error || 'Failed to load');
      setLoading(false);
    })();
  }, []);

  const isDirty = JSON.stringify(week) !== JSON.stringify(savedWeek);
  useEffect(() => { if (isDirty) { setDirty(); dirtyRef.current = true; } else { clearDirty(); dirtyRef.current = false; } }, [isDirty]);

  function updateDay(day: string, field: string, value: any) {
    setWeek((w) => ({ ...w, [day]: { ...w[day], [field]: value } }));
  }

  async function handleSave() {
    setSaving(true);
    onError('');
    onMsg('');
    const res = await apiMutate('/settings/hours', 'PUT', week);
    if (res.success) {
      setSavedWeek(JSON.parse(JSON.stringify(week)));
      clearDirty();
      dirtyRef.current = false;
      onMsg('Hours saved.');
    } else onError(res.error || 'Failed to save');
    setSaving(false);
  }

  if (loading) return <div className="h-48 animate-pulse rounded-lg bg-muted" />;

  return (
    <div className="space-y-4 max-w-lg">
      {DAYS.map((day) => {
        const d = week[day] || { open: false, start: '09:00', end: '17:00' };
        return (
          <div key={day} className="flex items-center gap-3 rounded-lg border p-3">
            <span className="w-28 text-sm font-medium">{day}</span>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={d.open}
                onChange={(e) => updateDay(day, 'open', e.target.checked)}
                disabled={!isOwner}
                className="rounded" />
              Open
            </label>
            {d.open && (
              <>
                <input type="time" value={d.start} onChange={(e) => updateDay(day, 'start', e.target.value)}
                  disabled={!isOwner}
                  className="rounded-md border px-2 py-1 text-sm disabled:opacity-60" />
                <span className="text-muted-foreground">to</span>
                <input type="time" value={d.end} onChange={(e) => updateDay(day, 'end', e.target.value)}
                  disabled={!isOwner}
                  className="rounded-md border px-2 py-1 text-sm disabled:opacity-60" />
              </>
            )}
            {!d.open && <span className="text-sm text-muted-foreground">Closed</span>}
          </div>
        );
      })}
      {isOwner && (
        <button onClick={handleSave} disabled={!isDirty || saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
          {saving ? 'Saving...' : 'Save Hours'}
        </button>
      )}
    </div>
  );
}

function FaqsTab({ isOwner, onError, onMsg, setDirty, clearDirty, dirtyRef }: any) {
  const [faqs, setFaqs] = useState<{ question: string; answer: string }[]>([]);
  const [savedFaqs, setSavedFaqs] = useState<{ question: string; answer: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newQ, setNewQ] = useState('');
  const [newA, setNewA] = useState('');
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [editQ, setEditQ] = useState('');
  const [editA, setEditA] = useState('');

  useEffect(() => {
    (async () => {
      const res = await apiGet('/settings/faqs');
      if (res.success) {
        setFaqs(res.data);
        setSavedFaqs(JSON.parse(JSON.stringify(res.data)));
      } else onError(res.error || 'Failed to load');
      setLoading(false);
    })();
  }, []);

  const isDirty = JSON.stringify(faqs) !== JSON.stringify(savedFaqs);
  useEffect(() => { if (isDirty) { setDirty(); dirtyRef.current = true; } else { clearDirty(); dirtyRef.current = false; } }, [isDirty]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newQ || !newA) return;
    const updated = [...faqs, { question: newQ, answer: newA }];
    setFaqs(updated);
    setNewQ('');
    setNewA('');
    setShowAdd(false);
  }

  async function handleSave() {
    setSaving(true);
    onError('');
    onMsg('');
    const res = await apiMutate('/settings/faqs', 'PUT', { faqs });
    if (res.success) {
      setSavedFaqs(JSON.parse(JSON.stringify(faqs)));
      clearDirty();
      dirtyRef.current = false;
      onMsg('FAQs saved.');
    } else onError(res.error || 'Failed to save');
    setSaving(false);
  }

  function handleDelete(idx: number) {
    if (!window.confirm('Delete this FAQ?')) return;
    setFaqs((f) => f.filter((_, i) => i !== idx));
  }

  function handleMoveUp(idx: number) {
    if (idx === 0) return;
    setFaqs((f) => {
      const copy = [...f];
      [copy[idx - 1], copy[idx]] = [copy[idx], copy[idx - 1]];
      return copy;
    });
  }

  function handleMoveDown(idx: number) {
    if (idx >= faqs.length - 1) return;
    setFaqs((f) => {
      const copy = [...f];
      [copy[idx], copy[idx + 1]] = [copy[idx + 1], copy[idx]];
      return copy;
    });
  }

  if (loading) return <div className="h-48 animate-pulse rounded-lg bg-muted" />;

  return (
    <div className="space-y-4 max-w-lg">
      {isOwner && (
        <button onClick={() => setShowAdd(!showAdd)}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
          {showAdd ? 'Cancel' : 'Add FAQ'}
        </button>
      )}

      {showAdd && (
        <form onSubmit={handleAdd} className="space-y-2 rounded-lg border p-4">
          <input type="text" value={newQ} onChange={(e) => setNewQ(e.target.value)} placeholder="Question"
            required className="w-full rounded-md border px-2 py-1.5 text-sm" />
          <textarea value={newA} onChange={(e) => setNewA(e.target.value)} placeholder="Answer" rows={2}
            required className="w-full rounded-md border px-2 py-1.5 text-sm" />
          <button type="submit" disabled={!newQ || !newA}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
            Add
          </button>
        </form>
      )}

      {faqs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No FAQs yet.</p>
      ) : (
        <div className="space-y-2">
          {faqs.map((faq, idx) => (
            <div key={idx} className="rounded-lg border p-3">
              {editIdx === idx ? (
                <div className="space-y-2">
                  <input type="text" value={editQ} onChange={(e) => setEditQ(e.target.value)}
                    className="w-full rounded-md border px-2 py-1.5 text-sm font-medium" />
                  <textarea value={editA} onChange={(e) => setEditA(e.target.value)} rows={2}
                    className="w-full rounded-md border px-2 py-1.5 text-sm" />
                  <div className="flex gap-1">
                    <button onClick={() => {
                      setFaqs((f) => f.map((item, i) => i === idx ? { question: editQ, answer: editA } : item));
                      setEditIdx(null);
                    }}
                      className="rounded border px-2 py-1 text-xs font-medium hover:bg-muted">Save</button>
                    <button onClick={() => setEditIdx(null)}
                      className="rounded border px-2 py-1 text-xs font-medium hover:bg-muted">Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{faq.question}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">{faq.answer}</p>
                    </div>
                    {isOwner && (
                      <div className="flex shrink-0 gap-1">
                        <button onClick={() => { setEditIdx(idx); setEditQ(faq.question); setEditA(faq.answer); }}
                          className="rounded border px-2 py-1 text-xs font-medium hover:bg-muted">Edit</button>
                        <button onClick={() => handleMoveUp(idx)} disabled={idx === 0}
                          className="rounded border px-2 py-1 text-xs font-medium hover:bg-muted disabled:opacity-40">&uarr;</button>
                        <button onClick={() => handleMoveDown(idx)} disabled={idx >= faqs.length - 1}
                          className="rounded border px-2 py-1 text-xs font-medium hover:bg-muted disabled:opacity-40">&darr;</button>
                        <button onClick={() => handleDelete(idx)}
                          className="rounded border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50">Delete</button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isOwner && (
        <button onClick={handleSave} disabled={!isDirty || saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
          {saving ? 'Saving...' : 'Save FAQs'}
        </button>
      )}
    </div>
  );
}

function AiTab({ isOwner, onError, onMsg, setDirty, clearDirty, dirtyRef }: any) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ greeting: '', leadCaptureEnabled: true, bookingEnabled: true, escalationEmail: '' });
  const [savedForm, setSavedForm] = useState({ ...form });
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await apiGet('/settings/ai');
      if (res.success) {
        setData(res.data);
        setForm(res.data);
        setSavedForm(JSON.parse(JSON.stringify(res.data)));
      } else onError(res.error || 'Failed to load');
      setLoading(false);
    })();
  }, []);

  const isDirty = JSON.stringify(form) !== JSON.stringify(savedForm);
  useEffect(() => { if (isDirty) { setDirty(); dirtyRef.current = true; } else { clearDirty(); dirtyRef.current = false; } }, [isDirty]);

  async function handleSave() {
    setSaving(true);
    onError('');
    onMsg('');
    const res = await apiMutate('/settings/ai', 'PATCH', form);
    if (res.success) {
      setSavedForm(JSON.parse(JSON.stringify(form)));
      clearDirty();
      dirtyRef.current = false;
      onMsg('AI settings saved.');
    } else onError(res.error || 'Failed to save');
    setSaving(false);
  }

  if (loading) return <div className="h-48 animate-pulse rounded-lg bg-muted" />;

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <label className="block text-sm font-medium mb-1">Greeting</label>
        <p className="text-xs text-muted-foreground mb-2">What visitors see when they start a chat.</p>
        <textarea value={form.greeting} onChange={(e) => setForm({ ...form, greeting: e.target.value })}
          readOnly={!isOwner} rows={3} placeholder="Welcome! How can I help you today?"
          className="w-full rounded-md border px-3 py-2 text-sm read-only:opacity-60 read-only:cursor-not-allowed" />
        {isOwner && (
          <button onClick={() => setShowPreview(!showPreview)}
            className="mt-1 rounded border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors">
            {showPreview ? 'Hide Preview' : 'Preview Greeting'}
          </button>
        )}
      </div>

      {showPreview && form.greeting && (
        <div className="rounded-lg border bg-muted/30 p-4">
          <p className="text-xs text-muted-foreground mb-2">Visitor preview:</p>
          <div className="rounded-lg bg-primary/10 p-3 text-sm">
            {form.greeting}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <label className="flex items-center gap-3 rounded-lg border p-3">
          <input type="checkbox" checked={form.leadCaptureEnabled}
            onChange={(e) => setForm({ ...form, leadCaptureEnabled: e.target.checked })}
            disabled={!isOwner}
            className="rounded" />
          <div>
            <p className="text-sm font-medium">Lead Capture</p>
            <p className="text-xs text-muted-foreground">Automatically collect visitor contact information.</p>
          </div>
        </label>

        <label className="flex items-center gap-3 rounded-lg border p-3">
          <input type="checkbox" checked={form.bookingEnabled}
            onChange={(e) => setForm({ ...form, bookingEnabled: e.target.checked })}
            disabled={!isOwner}
            className="rounded" />
          <div>
            <p className="text-sm font-medium">Booking</p>
            <p className="text-xs text-muted-foreground">Allow visitors to book appointments through chat.</p>
          </div>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">Escalation Email</label>
        <p className="text-xs text-muted-foreground mb-2">Where to send escalation notifications.</p>
        <input type="email" value={form.escalationEmail}
          onChange={(e) => setForm({ ...form, escalationEmail: e.target.value })}
          readOnly={!isOwner} placeholder="owner@example.com"
          className="w-full rounded-md border px-3 py-2 text-sm read-only:opacity-60 read-only:cursor-not-allowed" />
      </div>

      {isOwner && (
        <button onClick={handleSave} disabled={!isDirty || saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity">
          {saving ? 'Saving...' : 'Save AI Settings'}
        </button>
      )}
    </div>
  );
}
