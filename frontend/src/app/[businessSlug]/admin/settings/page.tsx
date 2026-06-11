'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Save, Plus, Trash2, Loader2 } from 'lucide-react';

type Feedback = { type: 'success' | 'error'; message: string } | null;

const TABS = [
  { key: 'business', label: 'Business' },
  { key: 'services', label: 'Services' },
  { key: 'hours', label: 'Hours' },
  { key: 'faqs', label: 'FAQs' },
  { key: 'ai', label: 'AI Receptionist' },
  { key: 'team', label: 'Team' },
];

function FeedbackBar({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;
  return (
    <div
      className={
        feedback.type === 'success'
          ? 'rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-400'
          : 'rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-2 text-sm text-destructive'
      }
    >
      {feedback.message}
    </div>
  );
}

function useFeedback() {
  const [feedback, setFeedback] = useState<Feedback>(null);
  const showFeedback = useCallback((fb: Feedback) => {
    setFeedback(fb);
    if (fb?.type === 'success') {
      setTimeout(() => setFeedback(null), 2000);
    }
  }, []);
  return { feedback, showFeedback };
}

// ─── Business Tab ───────────────────────────────────────────────

function BusinessTab({
  businessSlug,
  showFeedback,
}: {
  businessSlug: string;
  showFeedback: (fb: Feedback) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/public/businesses/${businessSlug}`);
        const json = await res.json();
        if (json.success && json.data) {
          const b = json.data;
          setName(b.name || '');
          setEmail(b.email || '');
          setPhone(b.phone || '');
          setAddress(b.address || '');
          setDescription(b.description || '');
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, [businessSlug]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const bizRes = await fetch(`/api/public/businesses/${businessSlug}`);
      const bizJson = await bizRes.json();
      const businessId = bizJson.success ? bizJson.data.id : null;
      const res = await fetch('/api/admin/settings/business', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, name, email, phone, address, description }),
      });
      const json = await res.json();
      if (json.success) showFeedback({ type: 'success', message: 'Business settings saved.' });
      else showFeedback({ type: 'error', message: json.error || 'Failed to save' });
    } catch {
      showFeedback({ type: 'error', message: 'Failed to save' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading business settings...</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>Manage your business profile details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Business Name *</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Phone</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Address</label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
      </div>
    </form>
  );
}

// ─── Services Tab ───────────────────────────────────────────────

type Service = {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
};

function ServicesTab({ showFeedback }: { showFeedback: (fb: Feedback) => void }) {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editService, setEditService] = useState<Service | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formDuration, setFormDuration] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/settings/services');
        const json = await res.json();
        if (json.success) setServices(json.data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function openAdd() {
    setEditService(null);
    setFormName('');
    setFormDesc('');
    setFormPrice('');
    setFormDuration('');
    setDialogOpen(true);
  }

  function openEdit(svc: Service) {
    setEditService(svc);
    setFormName(svc.name);
    setFormDesc(svc.description);
    setFormPrice(String(svc.price));
    setFormDuration(String(svc.duration_minutes));
    setDialogOpen(true);
  }

  async function handleSaveService(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        name: formName,
        description: formDesc,
        price: parseFloat(formPrice),
        duration_minutes: parseInt(formDuration, 10),
      };
      const method = editService ? 'PATCH' : 'POST';
      const url = editService
        ? `/api/admin/settings/services/${editService.id}`
        : '/api/admin/settings/services';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        if (editService) {
          setServices((prev) => prev.map((s) => (s.id === editService.id ? json.data : s)));
        } else {
          setServices((prev) => [...prev, json.data]);
        }
        setDialogOpen(false);
        showFeedback({
          type: 'success',
          message: editService ? 'Service updated.' : 'Service created.',
        });
      } else {
        showFeedback({ type: 'error', message: json.error || 'Failed to save service' });
      }
    } catch {
      showFeedback({ type: 'error', message: 'Failed to save service' });
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(svc: Service) {
    if (svc.is_active && services.filter((s) => s.is_active).length <= 1) {
      showFeedback({ type: 'error', message: 'At least one service must remain active.' });
      return;
    }
    try {
      const res = await fetch(`/api/admin/settings/services/${svc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !svc.is_active }),
      });
      const json = await res.json();
      if (json.success) {
        setServices((prev) => prev.map((s) => (s.id === svc.id ? json.data : s)));
      } else {
        showFeedback({ type: 'error', message: json.error || 'Failed to update service' });
      }
    } catch {
      showFeedback({ type: 'error', message: 'Failed to update service' });
    }
  }

  async function handleDelete(svc: Service) {
    if (!window.confirm(`Delete "${svc.name}"? This will soft-delete the service.`)) return;
    try {
      const res = await fetch(`/api/admin/settings/services/${svc.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setServices((prev) => prev.filter((s) => s.id !== svc.id));
        showFeedback({ type: 'success', message: 'Service deleted.' });
      } else {
        showFeedback({ type: 'error', message: json.error || 'Failed to delete service' });
      }
    } catch {
      showFeedback({ type: 'error', message: 'Failed to delete service' });
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading services...</div>;
  }

  const activeCount = services.filter((s) => s.is_active).length;

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Services</CardTitle>
            <CardDescription>Manage your business services.</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openAdd}>
                <Plus className="h-4 w-4" />
                Add Service
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editService ? 'Edit Service' : 'Add Service'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveService} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Name *</label>
                  <Input value={formName} onChange={(e) => setFormName(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Description</label>
                  <textarea
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    rows={3}
                    className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Price *</label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formPrice}
                      onChange={(e) => setFormPrice(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Duration (minutes) *</label>
                    <Input
                      type="number"
                      min="1"
                      value={formDuration}
                      onChange={(e) => setFormDuration(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editService ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Price</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Duration</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No services added yet.
                    </td>
                  </tr>
                )}
                {services.map((svc) => (
                  <tr key={svc.id} className="border-b last:border-0">
                    <td className="px-4 py-3">{svc.name}</td>
                    <td className="px-4 py-3">${Number(svc.price).toFixed(2)}</td>
                    <td className="px-4 py-3">{svc.duration_minutes} min</td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleToggle(svc)}>
                        <Badge variant={svc.is_active ? 'default' : 'secondary'}>
                          {svc.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(svc)}>
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(svc)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Hours Tab ──────────────────────────────────────────────────

type DaySchedule = {
  day_of_week: number;
  is_open: boolean;
  start_time: string;
  end_time: string;
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function HoursTab({ showFeedback }: { showFeedback: (fb: Feedback) => void }) {
  const [schedules, setSchedules] = useState<DaySchedule[]>(
    Array.from({ length: 7 }, (_, i) => ({
      day_of_week: i,
      is_open: i !== 0,
      start_time: '09:00',
      end_time: '17:00',
    }))
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/settings/hours');
        const json = await res.json();
        if (json.success && json.data) {
          const merged = schedules.map((s) => {
            const existing = json.data.find((d: DaySchedule) => d.day_of_week === s.day_of_week);
            return existing
              ? { ...s, is_open: existing.is_open ?? true, start_time: existing.start_time || '09:00', end_time: existing.end_time || '17:00' }
              : s;
          });
          setSchedules(merged);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function updateSchedule(day: number, field: keyof DaySchedule, value: boolean | string) {
    setSchedules((prev) =>
      prev.map((s) => (s.day_of_week === day ? { ...s, [field]: value } : s))
    );
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const openDays = schedules.filter((s) => s.is_open);
    if (openDays.length === 0) {
      showFeedback({ type: 'error', message: 'At least one day must be open.' });
      return;
    }
    for (const day of openDays) {
      if (day.start_time >= day.end_time) {
        showFeedback({
          type: 'error',
          message: `On ${FULL_DAY_NAMES[day.day_of_week]}, closing time must be after opening time.`,
        });
        return;
      }
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings/hours', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hours: schedules.map((s) => ({
            day_of_week: s.day_of_week,
            start_time: s.is_open ? s.start_time : null,
            end_time: s.is_open ? s.end_time : null,
          })),
        }),
      });
      const json = await res.json();
      if (json.success) showFeedback({ type: 'success', message: 'Hours saved.' });
      else showFeedback({ type: 'error', message: json.error || 'Failed to save hours' });
    } catch {
      showFeedback({ type: 'error', message: 'Failed to save hours' });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading hours...</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Business Hours</CardTitle>
          <CardDescription>Set your weekly operating hours.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {schedules.map((day) => (
            <div
              key={day.day_of_week}
              className="flex items-center gap-4 rounded-lg border p-3"
            >
              <div className="w-12 text-sm font-medium">{DAY_NAMES[day.day_of_week]}</div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={day.is_open}
                  onChange={(e) => updateSchedule(day.day_of_week, 'is_open', e.target.checked)}
                  className="rounded border-gray-300"
                />
                Open
              </label>
              {day.is_open ? (
                <div className="flex items-center gap-2 ml-auto">
                  <input
                    type="time"
                    value={day.start_time}
                    onChange={(e) => updateSchedule(day.day_of_week, 'start_time', e.target.value)}
                    className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
                  />
                  <span className="text-sm text-muted-foreground">to</span>
                  <input
                    type="time"
                    value={day.end_time}
                    onChange={(e) => updateSchedule(day.day_of_week, 'end_time', e.target.value)}
                    className="rounded-lg border border-input bg-background px-3 py-1.5 text-sm"
                  />
                </div>
              ) : (
                <span className="ml-auto text-sm text-muted-foreground">Closed</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="flex justify-end">
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Hours
        </Button>
      </div>
    </form>
  );
}

// ─── FAQs Tab ───────────────────────────────────────────────────

type FAQ = {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
};

function FAQsTab({ showFeedback }: { showFeedback: (fb: Feedback) => void }) {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editFaq, setEditFaq] = useState<FAQ | null>(null);
  const [formQuestion, setFormQuestion] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/settings/faqs');
        const json = await res.json();
        if (json.success) setFaqs(json.data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function openAdd() {
    setEditFaq(null);
    setFormQuestion('');
    setFormAnswer('');
    setDialogOpen(true);
  }

  function openEdit(faq: FAQ) {
    setEditFaq(faq);
    setFormQuestion(faq.question);
    setFormAnswer(faq.answer);
    setDialogOpen(true);
  }

  async function handleSaveFaq(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const method = editFaq ? 'PATCH' : 'POST';
      const url = editFaq
        ? `/api/admin/settings/faqs/${editFaq.id}`
        : '/api/admin/settings/faqs';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: formQuestion, answer: formAnswer }),
      });
      const json = await res.json();
      if (json.success) {
        if (editFaq) {
          setFaqs((prev) => prev.map((f) => (f.id === editFaq.id ? json.data : f)));
        } else {
          setFaqs((prev) => [...prev, json.data]);
        }
        setDialogOpen(false);
        showFeedback({
          type: 'success',
          message: editFaq ? 'FAQ updated.' : 'FAQ added.',
        });
      } else {
        showFeedback({ type: 'error', message: json.error || 'Failed to save FAQ' });
      }
    } catch {
      showFeedback({ type: 'error', message: 'Failed to save FAQ' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(faq: FAQ) {
    if (!window.confirm(`Delete this FAQ?`)) return;
    try {
      const res = await fetch(`/api/admin/settings/faqs/${faq.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setFaqs((prev) => prev.filter((f) => f.id !== faq.id));
        showFeedback({ type: 'success', message: 'FAQ deleted.' });
      } else {
        showFeedback({ type: 'error', message: json.error || 'Failed to delete FAQ' });
      }
    } catch {
      showFeedback({ type: 'error', message: 'Failed to delete FAQ' });
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading FAQs...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>FAQs</CardTitle>
            <CardDescription>Manage frequently asked questions.</CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openAdd}>
                <Plus className="h-4 w-4" />
                Add FAQ
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editFaq ? 'Edit FAQ' : 'Add FAQ'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSaveFaq} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Question *</label>
                  <Input
                    value={formQuestion}
                    onChange={(e) => setFormQuestion(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Answer *</label>
                  <textarea
                    value={formAnswer}
                    onChange={(e) => setFormAnswer(e.target.value)}
                    rows={4}
                    required
                    className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    {editFaq ? 'Update' : 'Add'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent className="pt-0">
          {faqs.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">No FAQs yet.</div>
          ) : (
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <div key={faq.id} className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="text-xs text-muted-foreground">#{i + 1}</div>
                      <div className="text-sm font-medium">{faq.question}</div>
                      <div className="text-sm text-muted-foreground">{faq.answer}</div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(faq)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(faq)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── AI Receptionist Tab ────────────────────────────────────────

function AIReceptionistTab({ showFeedback }: { showFeedback: (fb: Feedback) => void }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [greetingMessage, setGreetingMessage] = useState('');
  const [bookingEnabled, setBookingEnabled] = useState(true);
  const [leadCaptureEnabled, setLeadCaptureEnabled] = useState(true);
  const [escalationEmail, setEscalationEmail] = useState('');
  const [escalationPhone, setEscalationPhone] = useState('');
  const [emergencyKeywords, setEmergencyKeywords] = useState('');
  const [previewChat, setPreviewChat] = useState<{ role: string; content: string }[] | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/admin/settings/ai');
        const json = await res.json();
        if (json.success && json.data) {
          const d = json.data;
          setGreetingMessage(d.greeting_message || '');
          setBookingEnabled(d.booking_enabled ?? true);
          setLeadCaptureEnabled(d.lead_capture_enabled ?? true);
          setEscalationEmail(d.escalation_email || '');
          setEscalationPhone(d.escalation_phone || '');
          setEmergencyKeywords(
            Array.isArray(d.emergency_keywords) ? d.emergency_keywords.join(', ') : d.emergency_keywords || ''
          );
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings/ai', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          greeting_message: greetingMessage,
          booking_enabled: bookingEnabled,
          lead_capture_enabled: leadCaptureEnabled,
          escalation_email: escalationEmail,
          escalation_phone: escalationPhone,
          emergency_keywords: emergencyKeywords
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean),
        }),
      });
      const json = await res.json();
      if (json.success) showFeedback({ type: 'success', message: 'AI Receptionist settings saved.' });
      else showFeedback({ type: 'error', message: json.error || 'Failed to save' });
    } catch {
      showFeedback({ type: 'error', message: 'Failed to save' });
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    setPreviewing(true);
    setPreviewChat(null);
    try {
      const res = await fetch('/api/admin/settings/preview-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          greeting_message: greetingMessage,
          booking_enabled: bookingEnabled,
          lead_capture_enabled: leadCaptureEnabled,
          escalation_email: escalationEmail,
          escalation_phone: escalationPhone,
          emergency_keywords: emergencyKeywords
            .split(',')
            .map((k) => k.trim())
            .filter(Boolean),
        }),
      });
      const json = await res.json();
      if (json.success) setPreviewChat(json.data.conversation || []);
      else showFeedback({ type: 'error', message: json.error || 'Failed to preview' });
    } catch {
      showFeedback({ type: 'error', message: 'Failed to preview' });
    } finally {
      setPreviewing(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading AI Receptionist settings...</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>AI Receptionist</CardTitle>
          <CardDescription>Configure your AI receptionist behavior.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Greeting Message *</label>
            <textarea
              value={greetingMessage}
              onChange={(e) => setGreetingMessage(e.target.value)}
              rows={3}
              required
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-3">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={bookingEnabled}
                onChange={(e) => setBookingEnabled(e.target.checked)}
                className="rounded border-gray-300"
              />
              Booking Enabled
            </label>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={leadCaptureEnabled}
                onChange={(e) => setLeadCaptureEnabled(e.target.checked)}
                className="rounded border-gray-300"
              />
              Lead Capture Enabled
            </label>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Escalation Email</label>
            <Input
              type="email"
              value={escalationEmail}
              onChange={(e) => setEscalationEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Escalation Phone</label>
            <Input value={escalationPhone} onChange={(e) => setEscalationPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Emergency Keywords</label>
            <Input
              value={emergencyKeywords}
              onChange={(e) => setEmergencyKeywords(e.target.value)}
              placeholder="e.g. emergency, urgent, asap"
            />
            <p className="text-xs text-muted-foreground">Comma-separated list of keywords.</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={handlePreview} disabled={previewing}>
          {previewing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Preview Chat
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Settings
        </Button>
      </div>

      {previewChat && (
        <Card>
          <CardHeader>
            <CardTitle>Chat Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {previewChat.map((msg, i) => (
              <div
                key={i}
                className={`rounded-lg px-4 py-2 text-sm ${
                  msg.role === 'ai'
                    ? 'bg-primary/10 text-primary ml-8'
                    : 'bg-muted mr-8'
                }`}
              >
                <span className="text-xs font-medium text-muted-foreground uppercase">
                  {msg.role}
                </span>
                <p className="mt-1">{msg.content}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </form>
  );
}

// ─── Team Tab ───────────────────────────────────────────────────

type TeamMember = {
  id: string;
  user_id: string;
  business_id: string;
  role: string;
  full_name: string;
  status: string;
  invited_by: string | null;
  invited_at: string | null;
  accepted_at: string | null;
  created_at: string;
  email: string;
  profile_name: string;
};

function TeamTab({
  businessSlug,
  showFeedback,
}: {
  businessSlug: string;
  showFeedback: (fb: Feedback) => void;
}) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('staff');
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    setLoading(true);
    try {
      const businessRes = await fetch(`/api/public/businesses/${businessSlug}`);
      const businessJson = await businessRes.json();
      if (!businessJson.success) {
        showFeedback({ type: 'error', message: 'Business not found' });
        setLoading(false);
        return;
      }
      const businessId = businessJson.data.id;
      const res = await fetch(`/api/admin/team?businessId=${businessId}`);
      const json = await res.json();
      if (json.success) setMembers(json.data);
      else showFeedback({ type: 'error', message: json.error || 'Failed to load team' });
    } catch {
      showFeedback({ type: 'error', message: 'Failed to load team' });
    } finally {
      setLoading(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    try {
      const businessRes = await fetch(`/api/public/businesses/${businessSlug}`);
      const businessJson = await businessRes.json();
      if (!businessJson.success) {
        showFeedback({ type: 'error', message: 'Business not found' });
        setInviting(false);
        return;
      }
      const businessId = businessJson.data.id;
      const res = await fetch('/api/admin/team/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ businessId, email: inviteEmail, name: inviteName, role: inviteRole }),
      });
      const json = await res.json();
      if (json.success) {
        setMembers((prev) => [json.data, ...prev]);
        setShowInvite(false);
        setInviteEmail('');
        setInviteName('');
        setInviteRole('staff');
        showFeedback({ type: 'success', message: 'Invitation sent.' });
      } else {
        showFeedback({ type: 'error', message: json.error || 'Failed to invite' });
      }
    } catch {
      showFeedback({ type: 'error', message: 'Failed to invite' });
    } finally {
      setInviting(false);
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm('Remove this team member?')) return;
    try {
      const res = await fetch(`/api/admin/team/${memberId}`, { method: 'DELETE' });
      const json = await res.json();
      if (json.success) {
        setMembers((prev) => prev.filter((m) => m.id !== memberId));
        showFeedback({ type: 'success', message: 'Team member removed.' });
      } else {
        showFeedback({ type: 'error', message: json.error || 'Failed to remove' });
      }
    } catch {
      showFeedback({ type: 'error', message: 'Failed to remove' });
    }
  }

  if (loading) {
    return <div className="text-sm text-muted-foreground">Loading team...</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Team</h2>
          <p className="text-sm text-muted-foreground">Manage your team members.</p>
        </div>
        <Button size="sm" onClick={() => setShowInvite(true)}>
          <Plus className="h-4 w-4" />
          Invite Staff
        </Button>
      </div>

      {showInvite && (
        <Card>
          <CardHeader>
            <CardTitle>Invite Team Member</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleInvite} className="space-y-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email *</label>
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Name *</label>
                <Input
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="manager">Manager</option>
                  <option value="staff">Staff</option>
                </Select>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={inviting}>
                  {inviting ? 'Sending invite...' : 'Send Invite'}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowInvite(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No team members.
                    </td>
                  </tr>
                )}
                {members.map((member) => (
                  <tr key={member.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      {member.profile_name || member.full_name || '-'}
                    </td>
                    <td className="px-4 py-3">{member.email}</td>
                    <td className="px-4 py-3 capitalize">{member.role}</td>
                    <td className="px-4 py-3">
                      {member.status === 'accepted' ? (
                        <Badge variant="default">Active</Badge>
                      ) : member.status === 'pending' ? (
                        <Badge variant="secondary">Pending</Badge>
                      ) : (
                        <Badge variant="destructive">Suspended</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemove(member.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const businessSlug = params.businessSlug as string;
  const { feedback, showFeedback } = useFeedback();

  const [activeTab, setActiveTab] = useState('business');

  useEffect(() => {
    const tab = new URLSearchParams(window.location.search).get('tab');
    if (tab && TABS.some((t) => t.key === tab)) {
      setActiveTab(tab);
    }
  }, []);

  function handleTabChange(tab: string) {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    router.push(url.pathname + url.search);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your business configuration.</p>
      </div>

      <div className="flex gap-1 border-b pb-px overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`rounded-t-lg px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <FeedbackBar feedback={feedback} />

      {activeTab === 'business' && <BusinessTab businessSlug={businessSlug} showFeedback={showFeedback} />}
      {activeTab === 'services' && <ServicesTab showFeedback={showFeedback} />}
      {activeTab === 'hours' && <HoursTab showFeedback={showFeedback} />}
      {activeTab === 'faqs' && <FAQsTab showFeedback={showFeedback} />}
      {activeTab === 'ai' && <AIReceptionistTab showFeedback={showFeedback} />}
      {activeTab === 'team' && <TeamTab businessSlug={businessSlug} showFeedback={showFeedback} />}
    </div>
  );
}
