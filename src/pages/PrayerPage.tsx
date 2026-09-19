import { useState } from 'react';
import { MobileLayout, PageHeader, Section } from '@/components/layout/MobileLayout';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePrayer } from '@/contexts/PrayerContext';
import { ApiError } from '@/lib/api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartHandshake, Lock, Users, ShieldCheck, CheckCircle2, Send, Loader2 } from 'lucide-react';

type Visibility = 'private' | 'leadership' | 'cell';

const VISIBILITY_OPTIONS: { value: Visibility; label: string; help: string; icon: typeof Lock }[] = [
  {
    value: 'private',
    label: 'Just me',
    help: 'Only you can see this. Nobody is notified.',
    icon: Lock,
  },
  {
    value: 'leadership',
    label: 'Cell leaders',
    help: 'Visible to the leaders of this cell only.',
    icon: ShieldCheck,
  },
  {
    value: 'cell',
    label: 'Whole cell',
    help: 'Shared with everyone in the cell so they can pray with you.',
    icon: Users,
  },
];

export function PrayerPage() {
  const { prayerRequests, summary, isLoading, submitRequest, updateRequest, canManage } = usePrayer();

  const [composing, setComposing] = useState(false);
  const [body, setBody] = useState('');
  const [title, setTitle] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('leadership');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [tab, setTab] = useState<'wall' | 'mine'>('wall');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (body.trim().length < 3) {
      setFieldError('Please describe your prayer request.');
      return;
    }
    setSubmitting(true);
    setFieldError(null);
    try {
      await submitRequest({ body: body.trim(), title: title.trim() || undefined, visibility, isAnonymous });
      toast.success(
        visibility === 'private'
          ? 'Saved. Only you can see this.'
          : 'Your prayer request has been sent.',
      );
      setBody('');
      setTitle('');
      setIsAnonymous(false);
      setComposing(false);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'We could not send that. Please try again.';
      setFieldError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const visible = tab === 'mine' ? prayerRequests.filter((p) => p.isMine) : prayerRequests;

  return (
    <MobileLayout>
      <PageHeader
        title="Prayer"
        subtitle={`${summary.open + summary.praying} needing prayer`}
        action={
          <Button size="sm" onClick={() => setComposing((v) => !v)} className="gap-1.5">
            <Send className="h-4 w-4" aria-hidden />
            Request
          </Button>
        }
      />

      <Section className="pb-4">
        <div className="grid grid-cols-3 gap-3">
          <StatTile label="Open" value={summary.open} tone="bg-warning/15 text-warning" />
          <StatTile label="Praying" value={summary.praying} tone="bg-primary/10 text-primary" />
          <StatTile label="Answered" value={summary.answered} tone="bg-success/15 text-success" />
        </div>
      </Section>

      {/* Composer */}
      <AnimatePresence initial={false}>
        {composing && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <Section className="pb-5">
              <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-border bg-card p-4">
                <div>
                  <label htmlFor="prayer-title" className="block text-sm font-medium">
                    Title <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <Input
                    id="prayer-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Healing for my mother"
                    maxLength={200}
                    className="mt-1.5"
                  />
                </div>

                <div>
                  <label htmlFor="prayer-body" className="block text-sm font-medium">
                    What would you like prayer for?
                  </label>
                  <Textarea
                    id="prayer-body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={4}
                    maxLength={4000}
                    placeholder="Share as much or as little as you wish."
                    aria-invalid={fieldError ? true : undefined}
                    aria-describedby={fieldError ? 'prayer-body-error' : undefined}
                    className="mt-1.5"
                  />
                  {fieldError && (
                    <p id="prayer-body-error" className="mt-1.5 text-xs text-destructive">
                      {fieldError}
                    </p>
                  )}
                </div>

                <fieldset>
                  <legend className="text-sm font-medium">Who can see this?</legend>
                  <div className="mt-2 space-y-2">
                    {VISIBILITY_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      const selected = visibility === option.value;
                      return (
                        <label
                          key={option.value}
                          className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${
                            selected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                          }`}
                        >
                          <input
                            type="radio"
                            name="visibility"
                            value={option.value}
                            checked={selected}
                            onChange={() => setVisibility(option.value)}
                            className="mt-1 h-4 w-4 text-primary focus:ring-primary"
                          />
                          <span className="flex-1">
                            <span className="flex items-center gap-2 text-sm font-medium">
                              <Icon className="h-4 w-4" aria-hidden />
                              {option.label}
                            </span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">{option.help}</span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-primary"
                  />
                  <span className="text-sm">
                    <span className="font-medium">Send anonymously</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Your name is hidden from everyone, including leaders.
                    </span>
                  </span>
                </label>

                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting} className="flex-1 gap-2">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                    {submitting ? 'Sending…' : 'Send request'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setComposing(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </Section>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <Section className="pb-3">
        <div className="inline-flex rounded-full border border-border bg-muted/50 p-1">
          {(['wall', 'mine'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === key ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {key === 'wall' ? 'Prayer wall' : 'My requests'}
            </button>
          ))}
        </div>
      </Section>

      {/* List */}
      <Section className="pb-6">
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-2xl" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <EmptyPrayer tab={tab} onCompose={() => setComposing(true)} />
        ) : (
          <div className="space-y-3">
            {visible.map((request) => (
              <motion.article
                key={request.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border bg-card p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {request.title && (
                      <h3 className="font-serif text-base tracking-tight">{request.title}</h3>
                    )}
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                      {request.body}
                    </p>
                  </div>
                  <StatusBadge status={request.status} />
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    {request.visibility === 'cell' ? (
                      <Users className="h-3 w-3" aria-hidden />
                    ) : (
                      <Lock className="h-3 w-3" aria-hidden />
                    )}
                    {request.visibility === 'cell'
                      ? 'Shared with the cell'
                      : request.visibility === 'leadership'
                        ? 'Leaders only'
                        : 'Private'}
                  </span>
                  <span aria-hidden>·</span>
                  <span>{request.isAnonymous ? 'Anonymous' : request.authorName ?? 'A member'}</span>
                  {request.urgency === 'urgent' && (
                    <Badge variant="destructive" className="ml-auto">Urgent</Badge>
                  )}
                </div>

                {request.status === 'answered' && request.answeredNote && (
                  <p className="mt-3 rounded-xl bg-success/10 p-3 text-sm text-success-foreground">
                    <span className="font-medium">Answered: </span>
                    {request.answeredNote}
                  </p>
                )}

                {canManage && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                    {request.status === 'open' && (
                      <Button size="sm" variant="outline" onClick={() => updateRequest(request.id, { status: 'praying' })}>
                        Mark as praying
                      </Button>
                    )}
                    {request.status !== 'answered' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => {
                          const note = window.prompt('How was this answered? (optional, shared with the requester)');
                          if (note === null) return;
                          void updateRequest(request.id, { status: 'answered', answeredNote: note });
                        }}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                        Mark answered
                      </Button>
                    )}
                    {request.status !== 'closed' && request.status !== 'answered' && (
                      <Button size="sm" variant="ghost" onClick={() => updateRequest(request.id, { status: 'closed' })}>
                        Close
                      </Button>
                    )}
                  </div>
                )}
              </motion.article>
            ))}
          </div>
        )}
      </Section>

      <BottomNavigation />
    </MobileLayout>
  );
}

function StatTile({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-center">
      <div className={`mx-auto mb-1 inline-flex h-7 w-7 items-center justify-center rounded-lg ${tone}`}>
        <HeartHandshake className="h-4 w-4" aria-hidden />
      </div>
      <div className="text-xl font-semibold tabular-nums">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: 'open' | 'praying' | 'answered' | 'closed' }) {
  const map = {
    open: { label: 'Open', className: 'bg-warning/15 text-warning-foreground' },
    praying: { label: 'Praying', className: 'bg-primary/10 text-primary' },
    answered: { label: 'Answered', className: 'bg-success/15 text-success' },
    closed: { label: 'Closed', className: 'bg-muted text-muted-foreground' },
  } as const;
  const config = map[status];
  return <Badge variant="outline" className={`shrink-0 ${config.className}`}>{config.label}</Badge>;
}

function EmptyPrayer({ tab, onCompose }: { tab: 'wall' | 'mine'; onCompose: () => void }) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-8 text-center">
      <HeartHandshake className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
      <p className="mt-3 font-medium">
        {tab === 'mine' ? 'You have not shared a prayer request yet' : 'No prayer requests to show'}
      </p>
      <p className="mt-1 text-sm text-muted-foreground">
        {tab === 'mine'
          ? 'You can keep a request private, or share it with your leaders.'
          : 'When someone shares a request with the cell, it will appear here.'}
      </p>
      {tab === 'mine' && (
        <Button className="mt-4" onClick={onCompose}>
          Share a request
        </Button>
      )}
    </div>
  );
}
