'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { fetchPublicBusiness, createLead } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader } from '@/components/ui/loader';

export function AddLeadDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const params = useParams();
  const slug = params.businessSlug as string;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: bizData } = useSWR(slug ? `al-biz-${slug}` : null, () =>
    fetchPublicBusiness(slug), { revalidateOnFocus: false }
  );
  const businessId = bizData?.success && bizData.data ? bizData.data.id : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId || !name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await createLead({ businessId, name: name.trim(), email: email.trim() || null, phone: phone.trim() || null });
      if (res.success) {
        setName(''); setEmail(''); setPhone('');
        onSuccess();
        onClose();
      } else {
        setError(res.error || 'Failed to create lead');
      }
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Lead</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Name *" required
          />
          <Input
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="Email" type="email"
          />
          <Input
            value={phone} onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={saving || !name.trim()}>
              {saving ? <Loader size={16} color="currentColor" /> : 'Create Lead'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
