import { useState, useEffect, useCallback } from 'react';
import { MobileLayout, PageHeader, Section } from '@/components/layout/MobileLayout';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { api, ApiError } from '@/lib/api';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { UserPlus, Copy, Check, X, Link2, Loader2, Share2 } from 'lucide-react';

interface Invitation {
  id: string;
  role: string;
  note: string | null;
  expiresAt: string;
  usedAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  createdByName: string | null;
  homecellName: string;
  usedByName: string | null;
  status: 'active' | 'used' | 'expired' | 'revoked';
}

/**
 * Invitation links.
 *
 * The raw token is shown exactly once, immediately after creation, because the
 * server only stores its hash. The UI makes that explicit so a leader knows to
 * copy the link straight away rather than expecting to find it later.
 */
export function InvitePage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [role, setRole] = useState<'member' | 'assistant' | 'provider'>('member');
  const [note, setNote] = useState('');
  const [expiresInDays, setExpiresInDays] = useState(14);
  const [freshLink, setFreshLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.get<{ invitations: Invitation[] }>('/api/invitations');
      setInvitations(data.invitations ?? []);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not load invitations.');
      setInvitations([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const result = await api.post<{ id: string; token: string; expiresAt: string }>('/api/invitations', {
        role,
        note: note.trim() || undefined,
        expiresInDays,
      });
      // Build an absolute link the leader can paste anywhere.
      const url = `${window.location.origin}/join?invite=${result.token}`;
      setFreshLink(url);
      setNote('');
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not create an invitation.');
    } finally {
      setCreating(false);
    }
  };

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Link copied.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be blocked; fall back to showing it to copy manually.
      toast.info('Copy the link manually from the box below.');
    }
  };

  const shareLink = async (link: string) => {
    const shareData = {
      title: 'Join our cell',
      text: 'You are welcome to join our online cell. Use this link to register:',
      url: link,
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {
        // User cancelled or sharing unavailable; fall through to copy.
      }
    }
    await copyLink(link);
  };

  const revoke = async (id: string) => {
    if (!window.confirm('Revoke this invitation? The link will stop working immediately.')) return;
    try {
      await api.del(`/api/invitations/${id}`);
      toast.success('Invitation revoked.');
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not revoke.');
    }
  };

  return (
    <MobileLayout>
      <PageHeader title="Invite people" subtitle="Create a link to join this cell" />

      <Section className="pb-5">
        <form onSubmit={handleCreate} className="space-y-4 rounded-2xl border border-border bg-card p-4">
          <div>
            <label htmlFor="inv-role" className="block text-sm font-medium">
              Invite them as
            </label>
            <select
              id="inv-role"
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
            >
              <option value="member">Member</option>
              <option value="assistant">Assistant leader</option>
              <option value="provider">Provider</option>
            </select>
            <p className="mt-1.5 text-xs text-muted-foreground">
              Assistant and provider invitations can only be issued by a cell leader.
            </p>
          </div>

          <div>
            <label htmlFor="inv-note" className="block text-sm font-medium">
              Note <span className="text-muted-foreground">(optional, for your reference)</span>
            </label>
            <Input
              id="inv-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={300}
              placeholder="e.g. Chidi from the outreach"
              className="mt-1.5"
            />
          </div>

          <div>
            <label htmlFor="inv-expiry" className="block text-sm font-medium">
              Expires after
            </label>
            <select
              id="inv-expiry"
              value={expiresInDays}
              onChange={(e) => setExpiresInDays(Number(e.target.value))}
              className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
            >
              <option value={1}>1 day</option>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>

          <Button type="submit" disabled={creating} className="w-full gap-2">
            {creating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <UserPlus className="h-4 w-4" aria-hidden />}
            {creating ? 'Creating…' : 'Create invitation link'}
          </Button>
        </form>
      </Section>

      {/* The freshly created link — shown once, emphatically. */}
      {freshLink && (
        <Section className="pb-5">
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-success/40 bg-success/10 p-4"
          >
            <p className="flex items-center gap-2 text-sm font-medium">
              <Link2 className="h-4 w-4" aria-hidden />
              Your new invitation link
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Copy this now — for security it is only shown once and cannot be retrieved later.
            </p>
            <code className="mt-3 block overflow-x-auto rounded-xl bg-card p-3 text-xs">
              {freshLink}
            </code>
            <div className="mt-3 flex gap-2">
              <Button size="sm" className="gap-1.5" onClick={() => copyLink(freshLink)}>
                {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                {copied ? 'Copied' : 'Copy link'}
              </Button>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => shareLink(freshLink)}>
                <Share2 className="h-4 w-4" aria-hidden />
                Share
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setFreshLink(null)}>
                Done
              </Button>
            </div>
          </motion.div>
        </Section>
      )}

      {/* Existing invitations */}
      <Section className="pb-6">
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">Previously issued</h2>
        {isLoading ? (
          <div className="space-y-2">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        ) : invitations.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center">
            <UserPlus className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden />
            <p className="mt-2 text-sm font-medium">No invitations yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create a link above and share it with anyone you would like to join.
            </p>
          </div>
        ) : (
          <ul className="space-y-2">
            {invitations.map((invite) => (
              <li key={invite.id} className="rounded-xl border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium capitalize">{invite.role.replace('_', ' ')}</p>
                    {invite.note && <p className="truncate text-xs text-muted-foreground">{invite.note}</p>}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Expires {new Date(invite.expiresAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {invite.usedByName && ` · used by ${invite.usedByName}`}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <InviteStatusBadge status={invite.status} />
                    {invite.status === 'active' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2 text-destructive"
                        onClick={() => revoke(invite.id)}
                        aria-label="Revoke invitation"
                      >
                        <X className="h-4 w-4" aria-hidden />
                      </Button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <BottomNavigation />
    </MobileLayout>
  );
}

function InviteStatusBadge({ status }: { status: Invitation['status'] }) {
  const map = {
    active: { label: 'Active', className: 'bg-success/15 text-success' },
    used: { label: 'Used', className: 'bg-primary/10 text-primary' },
    expired: { label: 'Expired', className: 'bg-muted text-muted-foreground' },
    revoked: { label: 'Revoked', className: 'bg-destructive/15 text-destructive' },
  } as const;
  const config = map[status];
  return <Badge variant="outline" className={config.className}>{config.label}</Badge>;
}
