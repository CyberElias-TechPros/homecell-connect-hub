import { useState } from 'react';
import { MobileLayout, PageHeader, Section } from '@/components/layout/MobileLayout';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { api, ApiError } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Download, ShieldCheck, Trash2, Lock, Loader2, AlertTriangle } from 'lucide-react';

/**
 * Privacy controls.
 *
 * Data export and erasure are legal obligations under the NDPA (and GDPR for
 * members outside Nigeria), so these are real functionality rather than
 * informational copy.
 */
export function PrivacyPage() {
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requested, setRequested] = useState(false);
  const [reason, setReason] = useState('');
  const [showDelete, setShowDelete] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      // Fetched directly so the browser handles the file download and the
      // Content-Disposition filename from the server.
      const response = await fetch(
        `${(import.meta.env.VITE_API_URL as string | undefined) ?? ''}/api/auth/export`,
        { credentials: 'include' },
      );
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-data-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success('Your data has been downloaded.');
    } catch {
      toast.error('We could not prepare your data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const handleDeletionRequest = async () => {
    setRequesting(true);
    try {
      await api.post<{ message: string }>('/api/auth/deletion-request', { reason: reason.trim() || undefined });
      setRequested(true);
      setShowDelete(false);
      toast.success('Your request has been recorded.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'We could not record your request.');
    } finally {
      setRequesting(false);
    }
  };

  return (
    <MobileLayout>
      <PageHeader title="Privacy" subtitle="Your data and how it is handled" />

      <Section className="pb-5">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Lock className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <h2 className="text-sm font-medium">What we hold about you</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Your name, contact details, and the records of your participation in this cell —
                attendance, prayer requests you have shared, testimonies and follow-up notes.
              </p>
            </div>
          </div>

          <dl className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Signed in as</dt>
              <dd className="truncate font-medium">{user?.name}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Phone</dt>
              <dd className="font-medium">{user?.phone ?? 'Not provided'}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="truncate font-medium">{user?.email ?? 'Not provided'}</dd>
            </div>
          </dl>
        </div>
      </Section>

      {/* What is private */}
      <Section className="pb-5">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-success/15 text-success">
              <ShieldCheck className="h-4 w-4" aria-hidden />
            </div>
            <div>
              <h2 className="text-sm font-medium">Who can see what</h2>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                <li>
                  <span className="font-medium text-foreground">Private prayer requests</span> are
                  visible only to you. Not even your cell leader can read them.
                </li>
                <li>
                  <span className="font-medium text-foreground">Leader-only requests</span> are seen
                  by the leaders of this cell.
                </li>
                <li>
                  <span className="font-medium text-foreground">Testimonies</span> are reviewed by a
                  leader before anyone else sees them.
                </li>
                <li>
                  <span className="font-medium text-foreground">Leader notes</span> about a member are
                  visible only to the cell's leaders, never to other members.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </Section>

      {/* Export */}
      <Section className="pb-5">
        <div className="rounded-2xl border border-border bg-card p-4">
          <h2 className="text-sm font-medium">Download a copy of your data</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Get everything held about you as a file you can keep. This does not include other
            people's information.
          </p>
          <Button onClick={handleExport} disabled={exporting} variant="outline" className="mt-3 gap-2">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Download className="h-4 w-4" aria-hidden />}
            {exporting ? 'Preparing…' : 'Download my data'}
          </Button>
        </div>
      </Section>

      {/* Deletion */}
      <Section className="pb-8">
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
          <h2 className="text-sm font-medium text-destructive">Request account deletion</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask for your account and personal information to be removed. Your cell leader will
            contact you to confirm first — nothing is deleted automatically.
          </p>

          {requested ? (
            <p className="mt-3 rounded-xl bg-success/10 p-3 text-sm text-success">
              Your request has been recorded. A cell leader will be in touch.
            </p>
          ) : showDelete ? (
            <div className="mt-3 space-y-3">
              <div className="flex items-start gap-2 rounded-xl bg-warning/10 p-3 text-xs text-warning-foreground">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>
                  Your attendance and report history may need to be retained in anonymised form for
                  the cell's records. Your personal details will be removed.
                </span>
              </div>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Is there anything you'd like us to know? (optional)"
                className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
              />
              <div className="flex gap-2">
                <Button variant="destructive" onClick={handleDeletionRequest} disabled={requesting} className="gap-2">
                  {requesting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                  Confirm request
                </Button>
                <Button variant="ghost" onClick={() => setShowDelete(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" className="mt-3 gap-2 text-destructive" onClick={() => setShowDelete(true)}>
              <Trash2 className="h-4 w-4" aria-hidden />
              Request deletion
            </Button>
          )}
        </div>
      </Section>

      <BottomNavigation />
    </MobileLayout>
  );
}
