'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/auth';
import { TeamManagement } from '@/components/admin/team-management';
import { Globe, MessageCircle, Phone, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import { Loader } from '@/components/ui/loader';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

type TabId = 'business' | 'services' | 'hours' | 'faqs' | 'ai' | 'team' | 'channels';

const TABS: { id: TabId; label: string }[] = [
  { id: 'business', label: 'Business' },
  { id: 'services', label: 'Services' },
  { id: 'hours', label: 'Hours' },
  { id: 'faqs', label: 'FAQs' },
  { id: 'ai', label: 'AI' },
  { id: 'team', label: 'Team' },
  { id: 'channels', label: 'Channels' },
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
      const [membershipRes, profileRes] = await Promise.all([
        apiGet('/me/membership'),
        apiGet('/me/profile'),
      ]);
      if (membershipRes.success && membershipRes.data) {
        setRole(membershipRes.data.role);
      } else if (profileRes.success && profileRes.data?.global_role === 'SUPER_ADMIN') {
        setRole('owner');
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
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader size={40} color="#a3a3a3" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">Settings</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Manage your business configuration.           {!isOwner && <span className="text-zinc-500">(View-only)</span>}
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">{error}</div>
      )}
      {msg && (
        <div className="rounded-md border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-400">{msg}</div>
      )}

      <div className="flex gap-1 border-b border-zinc-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => handleTabSwitch(t.id)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === t.id
                ? 'border-blue-400 text-blue-400'
                : 'border-transparent text-zinc-400 hover:text-white'
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
          <p className="text-sm text-zinc-400">
            Manage staff and owners for this business.
          </p>
          <TeamManagement readOnly={!isOwner} />
        </div>
      )}
      {activeTab === 'channels' && (
        <ChannelsTab isOwner={isOwner} onError={setError} onMsg={setMsg} />
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

  if (loading) return <div className="flex items-center justify-center h-48"><Loader size={40} color="#a3a3a3" /></div>;

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">Business Name</label>
        <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
          readOnly={!isOwner}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 read-only:opacity-60 read-only:cursor-not-allowed" />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">Email</label>
        <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
          readOnly={!isOwner}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 read-only:opacity-60 read-only:cursor-not-allowed" />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">Phone</label>
        <input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
          readOnly={!isOwner}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 read-only:opacity-60 read-only:cursor-not-allowed" />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">Address</label>
        <input type="text" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
          readOnly={!isOwner}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 read-only:opacity-60 read-only:cursor-not-allowed" />
      </div>
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">Description</label>
        <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
          readOnly={!isOwner} rows={3}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 read-only:opacity-60 read-only:cursor-not-allowed" />
      </div>
      {isOwner && (
        <button onClick={handleSave} disabled={!isDirty || saving}
          className="rounded-md bg-blue-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500/80 disabled:opacity-50 transition-opacity">
          {saving ? <Loader size={16} color="currentColor" /> : 'Save'}
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

  if (loading) return <div className="flex items-center justify-center h-48"><Loader size={40} color="#a3a3a3" /></div>;

  return (
    <div className="space-y-4">
      {isOwner && (
        <button onClick={() => setShowCreate(!showCreate)}
          className="rounded-md bg-blue-600/80 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500/80 transition-opacity">
          {showCreate ? 'Cancel' : 'Add Service'}
        </button>
      )}

      {showCreate && (
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-3 product-card p-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-zinc-300 mb-1">Name *</label>
              <input type="text" value={newSvc.name} onChange={(e) => setNewSvc({ ...newSvc, name: e.target.value })}
                required className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white placeholder-zinc-500" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-zinc-300 mb-1">Description</label>
              <input type="text" value={newSvc.description} onChange={(e) => setNewSvc({ ...newSvc, description: e.target.value })}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white placeholder-zinc-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Duration (min) *</label>
              <input type="number" value={newSvc.durationMinutes} onChange={(e) => setNewSvc({ ...newSvc, durationMinutes: Math.max(1, +e.target.value) })}
                min={1} required className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white" />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-300 mb-1">Price ($) *</label>
              <input type="number" value={newSvc.price} onChange={(e) => setNewSvc({ ...newSvc, price: Math.max(0, +e.target.value) })}
                min={0} step="0.01" required className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white" />
            </div>
            <div className="col-span-2">
              <button type="submit" disabled={saving === 'create' || !newSvc.name}
                className="rounded-md bg-blue-600/80 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500/80 disabled:opacity-50 transition-opacity">
                {saving === 'create' ? <Loader size={16} color="currentColor" /> : 'Create Service'}
              </button>
            </div>
          </form>
      )}

      {services.length === 0 ? (
        <p className="text-sm text-zinc-400">No services yet.</p>
      ) : (
        <div className="overflow-x-auto product-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-black/50">
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Duration</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Price</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status</th>
                {isOwner && <th className="px-4 py-3 text-right text-xs font-semibold text-zinc-400 uppercase tracking-wider">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {services.map((s: any) => (
                <tr key={s.id} className={`hover:bg-zinc-800/30 transition-colors duration-150 ${!s.isActive ? 'opacity-50' : ''}`}>
                  {editId === s.id ? (
                    <>
                      <td className="px-4 py-2">
                        <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          className="w-full rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" value={editForm.durationMinutes} onChange={(e) => setEditForm({ ...editForm, durationMinutes: Math.max(1, +e.target.value) })}
                          min={1} className="w-20 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white" />
                      </td>
                      <td className="px-4 py-2">
                        <input type="number" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: Math.max(0, +e.target.value) })}
                          min={0} step="0.01" className="w-24 rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-xs text-white" />
                      </td>
                      <td className="px-4 py-2 text-sm text-zinc-300">{s.isActive ? 'Active' : 'Disabled'}</td>
                      <td className="px-4 py-2 text-right space-x-1">
                        <button onClick={() => handleEdit(s.id)} disabled={saving === s.id}
                          className="rounded border border-zinc-700 px-2 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-50">Save</button>
                        <button onClick={() => setEditId(null)}
                          className="rounded border border-zinc-700 px-2 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-800">Cancel</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 text-sm font-medium text-white">{s.name}</td>
                      <td className="px-4 py-3 text-sm text-zinc-400">{s.durationMinutes} min</td>
                      <td className="px-4 py-3 text-sm text-zinc-300">${s.price.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                          s.isActive ? 'border-green-500/20 bg-green-500/10 text-green-400' : 'border-zinc-700 bg-zinc-800 text-zinc-300'
                        }`}>{s.isActive ? 'Active' : 'Disabled'}</span>
                      </td>
                      {isOwner && (
                        <td className="px-4 py-3 text-right space-x-1">
                          <button onClick={() => {
                            setEditId(s.id);
                            setEditForm({ name: s.name, description: s.description, durationMinutes: s.durationMinutes, price: s.price });
                          }}
                            className="rounded border border-zinc-700 px-2 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors">Edit</button>
                          <button onClick={() => handleToggle(s.id, s.isActive)} disabled={saving === s.id}
                            className={`rounded border px-2 py-1 text-xs font-medium transition-colors ${
                              s.isActive ? 'border-orange-500/30 text-orange-400 hover:bg-orange-500/10' : 'border-green-500/30 text-green-400 hover:bg-green-500/10'
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

  if (loading) return <div className="flex items-center justify-center h-48"><Loader size={40} color="#a3a3a3" /></div>;

  return (
    <div className="space-y-4 max-w-lg">
      {DAYS.map((day) => {
        const d = week[day] || { open: false, start: '09:00', end: '17:00' };
        return (
          <div key={day} className="flex items-center gap-3 product-card p-3">
            <span className="w-28 text-sm font-medium text-white">{day}</span>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={d.open}
                onChange={(e) => updateDay(day, 'open', e.target.checked)}
                disabled={!isOwner}
                className="rounded accent-blue-500" />
              Open
            </label>
            {d.open && (
              <>
                <input type="time" value={d.start} onChange={(e) => updateDay(day, 'start', e.target.value)}
                  disabled={!isOwner}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-white disabled:opacity-60" />
                <span className="text-zinc-400">to</span>
                <input type="time" value={d.end} onChange={(e) => updateDay(day, 'end', e.target.value)}
                  disabled={!isOwner}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1 text-sm text-white disabled:opacity-60" />
              </>
            )}
            {!d.open && <span className="text-sm text-zinc-400">Closed</span>}
          </div>
        );
      })}
      {isOwner && (
        <button onClick={handleSave} disabled={!isDirty || saving}
          className="rounded-md bg-blue-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500/80 disabled:opacity-50 transition-opacity">
          {saving ? <Loader size={16} color="currentColor" /> : 'Save Hours'}
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

  if (loading) return <div className="flex items-center justify-center h-48"><Loader size={40} color="#a3a3a3" /></div>;

  return (
    <div className="space-y-4 max-w-lg">
      {isOwner && (
        <button onClick={() => setShowAdd(!showAdd)}
          className="rounded-md bg-blue-600/80 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-500/80 transition-opacity">
          {showAdd ? 'Cancel' : 'Add FAQ'}
        </button>
      )}

      {showAdd && (
        <form onSubmit={handleAdd} className="space-y-2 product-card p-4">
          <input type="text" value={newQ} onChange={(e) => setNewQ(e.target.value)} placeholder="Question"
            required className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white placeholder-zinc-500" />
          <textarea value={newA} onChange={(e) => setNewA(e.target.value)} placeholder="Answer" rows={2}
            required className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white placeholder-zinc-500" />
          <button type="submit" disabled={!newQ || !newA}
            className="rounded-md bg-blue-600/80 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500/80 disabled:opacity-50 transition-opacity">
            Add
          </button>
        </form>
      )}

      {faqs.length === 0 ? (
        <p className="text-sm text-zinc-400">No FAQs yet.</p>
      ) : (
        <div className="space-y-2">
          {faqs.map((faq, idx) => (
            <div key={idx} className="product-card p-3">
              {editIdx === idx ? (
                <div className="space-y-2">
                  <input type="text" value={editQ} onChange={(e) => setEditQ(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm font-medium text-white" />
                  <textarea value={editA} onChange={(e) => setEditA(e.target.value)} rows={2}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-1.5 text-sm text-white" />
                  <div className="flex gap-1">
                    <button onClick={() => {
                      setFaqs((f) => f.map((item, i) => i === idx ? { question: editQ, answer: editA } : item));
                      setEditIdx(null);
                    }}
                      className="rounded border border-zinc-700 px-2 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-800">Save</button>
                    <button onClick={() => setEditIdx(null)}
                      className="rounded border border-zinc-700 px-2 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-800">Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{faq.question}</p>
                      <p className="mt-0.5 text-xs text-zinc-400">{faq.answer}</p>
                    </div>
                    {isOwner && (
                      <div className="flex shrink-0 gap-1">
                        <button onClick={() => { setEditIdx(idx); setEditQ(faq.question); setEditA(faq.answer); }}
                          className="rounded border border-zinc-700 px-2 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-800">Edit</button>
                        <button onClick={() => handleMoveUp(idx)} disabled={idx === 0}
                          className="rounded border border-zinc-700 px-2 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-40">&uarr;</button>
                        <button onClick={() => handleMoveDown(idx)} disabled={idx >= faqs.length - 1}
                          className="rounded border border-zinc-700 px-2 py-1 text-xs font-medium text-zinc-300 hover:bg-zinc-800 disabled:opacity-40">&darr;</button>
                        <button onClick={() => handleDelete(idx)}
                          className="rounded border border-red-500/30 px-2 py-1 text-xs font-medium text-red-400 hover:bg-red-500/10">Delete</button>
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
          className="rounded-md bg-blue-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500/80 disabled:opacity-50 transition-opacity">
          {saving ? <Loader size={16} color="currentColor" /> : 'Save FAQs'}
        </button>
      )}
    </div>
  );
}

const CHANNEL_META: Record<string, { label: string; description: string; icon: any; badge?: string }> = {
  web_chat: { label: 'Website Chat', description: 'Real-time chat on your website', icon: Globe },
  whatsapp: { label: 'WhatsApp', description: 'WhatsApp Business messaging', icon: MessageCircle },
  voice: { label: 'Voice AI', description: 'AI-powered phone receptionist', icon: Phone, badge: 'Coming Soon' },
};

function ChannelsTab({ isOwner, onError, onMsg }: { isOwner: boolean; onError: (msg: string) => void; onMsg: (msg: string) => void }) {
  const [channels, setChannels] = useState<any[]>([]);
  const [capabilities, setCapabilities] = useState<any[]>([]);
  const [deliveryHealth, setDeliveryHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [whatsappPhone, setWhatsappPhone] = useState('');
  const [savingPhone, setSavingPhone] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await apiGet('/settings/channels');
      if (res.success) {
        setChannels(res.data.channels);
        setCapabilities(res.data.capabilities);
        if (res.data.deliveryHealth) {
          setDeliveryHealth(res.data.deliveryHealth);
        }
        const wa = res.data.channels.find((c: any) => c.channelType === 'whatsapp');
        if (wa?.configJson?.whatsappNumber) {
          setWhatsappPhone(wa.configJson.whatsappNumber);
        }
      } else {
        onError(res.error || 'Failed to load channels');
      }
      setLoading(false);
    })();
  }, []);

  async function handleToggle(channelType: string, currentEnabled: boolean) {
    setToggling(channelType);
    onError('');
    onMsg('');
    try {
      const res = await apiMutate(`/settings/channels/${channelType}`, 'PATCH', {
        enabled: !currentEnabled,
      });
      if (res.success) {
        setChannels((prev) =>
          prev.map((c) =>
            c.channelType === channelType ? { ...c, enabled: !currentEnabled } : c
          )
        );
        onMsg(currentEnabled ? 'Channel disabled.' : 'Channel enabled.');
      } else {
        onError(res.error || 'Failed to update channel');
      }
    } catch {
      onError('Failed to update channel');
    }
    setToggling(null);
  }

  async function handleSaveWhatsappPhone() {
    setSavingPhone(true);
    onError('');
    onMsg('');
    try {
      const res = await apiMutate('/settings/channels/whatsapp', 'PATCH', {
        configJson: { whatsappNumber: whatsappPhone },
      });
      if (res.success) {
        setChannels((prev) =>
          prev.map((c) =>
            c.channelType === 'whatsapp' ? { ...c, configJson: { whatsappNumber: whatsappPhone } } : c
          )
        );
        onMsg('WhatsApp number saved.');
      } else {
        onError(res.error || 'Failed to save WhatsApp number');
      }
    } catch {
      onError('Failed to save WhatsApp number');
    }
    setSavingPhone(false);
  }

  if (loading) return <div className="flex items-center justify-center h-48"><Loader size={40} color="#a3a3a3" /></div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">
        Manage communication channels for your business. At least one channel must remain enabled.
      </p>

      {channels.length === 0 ? (
        <p className="text-sm text-zinc-400">No channels configured.</p>
      ) : (
        <div className="space-y-3">
          {channels.map((ch: any) => {
            const meta = CHANNEL_META[ch.channelType] || {
              label: ch.channelType,
              description: '',
              icon: MessageCircle,
            };
            const Icon = meta.icon;

            return (
              <div
                key={ch.channelType}
                className={`product-card p-4 transition-opacity ${!ch.enabled ? 'opacity-60' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg p-2 ${ch.enabled ? 'bg-blue-500/10 text-blue-400' : 'bg-zinc-800 text-zinc-500'}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white">{meta.label}</p>
                        {meta.badge && (
                          <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                            {meta.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400">{meta.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {ch.enabled ? (
                      <span className="flex items-center gap-1 text-xs font-medium text-green-400">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Connected
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-medium text-zinc-400">
                        <XCircle className="h-3.5 w-3.5" />
                        Disabled
                      </span>
                    )}

                    {isOwner && !meta.badge && (
                      <button
                        onClick={() => handleToggle(ch.channelType, ch.enabled)}
                        disabled={toggling === ch.channelType}
                        className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                          ch.enabled
                            ? 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                            : 'border-green-500/30 text-green-400 hover:bg-green-500/10'
                        }`}
                      >
                        {toggling === ch.channelType
                          ? '...'
                          : ch.enabled
                          ? 'Disable'
                          : 'Enable'}
                      </button>
                    )}

                    {!isOwner && (
                      <span className="text-xs text-zinc-400">
                        {ch.enabled ? 'Active' : 'Inactive'}
                      </span>
                    )}
                  </div>
                </div>

                {ch.channelType === 'whatsapp' && isOwner && (
                  <div className="mt-4 border-t border-zinc-800 pt-4">
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-zinc-300 mb-1">WhatsApp Phone Number</label>
                        <p className="text-xs text-zinc-400 mb-2">
                          The Twilio WhatsApp-enabled number for your business (e.g., +1234567890).
                        </p>
                        <input
                          type="text"
                          value={whatsappPhone}
                          onChange={(e) => setWhatsappPhone(e.target.value)}
                          placeholder="+1234567890"
                          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500"
                        />
                      </div>
                      <button
                        onClick={handleSaveWhatsappPhone}
                        disabled={savingPhone || !whatsappPhone}
                        className="rounded-md bg-blue-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500/80 disabled:opacity-50 transition-opacity"
                      >
                        {savingPhone ? <Loader size={16} color="currentColor" /> : 'Save'}
                      </button>
                    </div>

                    {deliveryHealth && (
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="rounded-md border border-zinc-800 bg-zinc-800/30 p-3">
                          <p className="text-xs text-zinc-400">Delivery Health</p>
                          <p className="mt-1 text-lg font-semibold text-white">
                            {deliveryHealth.successRate}%
                          </p>
                          <p className="text-xs text-zinc-500">
                            {deliveryHealth.delivered} delivered · {deliveryHealth.failed} failed
                          </p>
                        </div>
                        <div className="rounded-md border border-zinc-800 bg-zinc-800/30 p-3">
                          <p className="text-xs text-zinc-400">Total Messages</p>
                          <p className="mt-1 text-lg font-semibold text-white">{deliveryHealth.total}</p>
                          <p className="text-xs text-zinc-500">
                            {deliveryHealth.pending > 0 ? `${deliveryHealth.pending} pending` : 'All processed'}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="mt-3 flex items-center gap-3">
                      <span className="text-xs text-zinc-400">
                        Provider: {ch.provider === 'twilio' ? 'Twilio' : ch.provider || 'Not configured'}
                      </span>
                      {ch.configJson?.whatsappNumber && (
                        <span className="flex items-center gap-1 text-xs text-green-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Number configured
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
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

  if (loading) return <div className="flex items-center justify-center h-48"><Loader size={40} color="#a3a3a3" /></div>;

  return (
    <div className="space-y-4 max-w-lg">
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">Greeting</label>
        <p className="text-xs text-zinc-400 mb-2">What visitors see when they start a chat.</p>
        <textarea value={form.greeting} onChange={(e) => setForm({ ...form, greeting: e.target.value })}
          readOnly={!isOwner} rows={3} placeholder="Welcome! How can I help you today?"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 read-only:opacity-60 read-only:cursor-not-allowed" />
        {isOwner && (
          <button onClick={() => setShowPreview(!showPreview)}
            className="mt-1 rounded border border-zinc-700 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-800 transition-colors">
            {showPreview ? 'Hide Preview' : 'Preview Greeting'}
          </button>
        )}
      </div>

      {showPreview && form.greeting && (
        <div className="product-card p-4">
          <p className="text-xs text-zinc-400 mb-2">Visitor preview:</p>
          <div className="rounded-lg bg-blue-500/10 p-3 text-sm text-zinc-300">
            {form.greeting}
          </div>
        </div>
      )}

      <div className="space-y-3">
        <label className="flex items-center gap-3 product-card p-3">
          <input type="checkbox" checked={form.leadCaptureEnabled}
            onChange={(e) => setForm({ ...form, leadCaptureEnabled: e.target.checked })}
            disabled={!isOwner}
            className="rounded accent-blue-500" />
          <div>
            <p className="text-sm font-medium text-white">Lead Capture</p>
            <p className="text-xs text-zinc-400">Automatically collect visitor contact information.</p>
          </div>
        </label>

        <label className="flex items-center gap-3 product-card p-3">
          <input type="checkbox" checked={form.bookingEnabled}
            onChange={(e) => setForm({ ...form, bookingEnabled: e.target.checked })}
            disabled={!isOwner}
            className="rounded accent-blue-500" />
          <div>
            <p className="text-sm font-medium text-white">Booking</p>
            <p className="text-xs text-zinc-400">Allow visitors to book appointments through chat.</p>
          </div>
        </label>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">Escalation Email</label>
        <p className="text-xs text-zinc-400 mb-2">Where to send escalation notifications.</p>
        <input type="email" value={form.escalationEmail}
          onChange={(e) => setForm({ ...form, escalationEmail: e.target.value })}
          readOnly={!isOwner} placeholder="owner@example.com"
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 read-only:opacity-60 read-only:cursor-not-allowed" />
      </div>

      {isOwner && (
        <button onClick={handleSave} disabled={!isDirty || saving}
          className="rounded-md bg-blue-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500/80 disabled:opacity-50 transition-opacity">
          {saving ? <Loader size={16} color="currentColor" /> : 'Save AI Settings'}
        </button>
      )}
    </div>
  );
}
