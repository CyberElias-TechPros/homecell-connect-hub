import { useState } from 'react';
import { MobileLayout, PageHeader, Section } from '@/components/layout/MobileLayout';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTestimonies } from '@/contexts/TestimoniesContext';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Lock, Users, Globe, Check, X, Loader2, Quote } from 'lucide-react';

type Visibility = 'leadership' | 'cell' | 'public';

export function TestimoniesPage() {
  const { testimonies, summary, isLoading, submit, review, withdraw } = useTestimonies();
  const { user, permissions } = useAuth();
  const canModerate = permissions.includes('manage_prayer_requests');

  const [composing, setComposing] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('cell');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [consentPublic, setConsentPublic] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<'wall' | 'mine' | 'review'>('wall');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (title.trim().length < 3) return setError('Give your testimony a title.');
    if (body.trim().length < 10) return setError('Please write a little more.');
    if (visibility === 'public' && !consentPublic) {
      return setError('Please confirm you are happy for this to be shared publicly.');
    }
    setSubmitting(true);
    setError(null);
    try {
      await submit({
        title: title.trim(),
        body: body.trim(),
        visibility,
        isAnonymous,
        consentToSharePublicly: consentPublic,
      });
      toast.success('Thank you. Your testimony has been sent for review.');
      setTitle('');
      setBody('');
      setComposing(false);
      setConsentPublic(false);
      setIsAnonymous(false);
      setTab('mine');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'We could not send that. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const pending = testimonies.filter((t) => t.status === 'pending');
  const visible =
    tab === 'mine'
      ? testimonies.filter((t) => t.isMine)
      : tab === 'review'
        ? pending
        : testimonies.filter((t) => t.status === 'approved');

  return (
    <MobileLayout>
      <PageHeader
        title="Testimonies"
        subtitle={summary.pending > 0 && canModerate ? `${summary.pending} awaiting review` : 'What God has done'}
        action={
          <Button size="sm" onClick={() => setComposing((v) => !v)} className="gap-1.5">
            <Sparkles className="h-4 w-4" aria-hidden />
            Share
          </Button>
        }
      />

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
                  <label htmlFor="t-title" className="block text-sm font-medium">
                    Title
                  </label>
                  <Input
                    id="t-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. God provided a job"
                    maxLength={200}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <label htmlFor="t-body" className="block text-sm font-medium">
                    What happened?
                  </label>
                  <Textarea
                    id="t-body"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    rows={5}
                    maxLength={8000}
                    placeholder="Tell us what God did."
                    className="mt-1.5"
                  />
                </div>

                <fieldset>
                  <legend className="text-sm font-medium">Who should see this?</legend>
                  <div className="mt-2 space-y-2">
                    {(
                      [
                        { value: 'leadership', label: 'Cell leaders', help: 'Reviewed privately.', icon: Lock },
                        { value: 'cell', label: 'Our cell', help: 'Shared with the cell once approved.', icon: Users },
                        { value: 'public', label: 'Publicly', help: 'May be shared outside the cell. Needs your consent.', icon: Globe },
                      ] as const
                    ).map((option) => {
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
                            name="t-visibility"
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

                {visibility === 'public' && (
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-muted/30 p-3">
                    <input
                      type="checkbox"
                      checked={consentPublic}
                      onChange={(e) => setConsentPublic(e.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-primary"
                    />
                    <span className="text-sm">
                      <span className="font-medium">I consent to this being shared publicly.</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        You can withdraw it at any time and it will be removed.
                      </span>
                    </span>
                  </label>
                )}

                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-primary"
                  />
                  <span className="text-sm">
                    <span className="font-medium">Share anonymously</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      Your name will not be shown, including to leaders.
                    </span>
                  </span>
                </label>

                {error && (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                )}

                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting} className="flex-1 gap-2">
                    {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                    {submitting ? 'Sending…' : 'Submit for review'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setComposing(false)}>
                    Cancel
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  A cell leader reviews every testimony before it is shown to anyone else.
                </p>
              </form>
            </Section>
          </motion.div>
        )}
      </AnimatePresence>

      <Section className="pb-3">
        <div className="inline-flex rounded-full border border-border bg-muted/50 p-1">
          {(
            [
              { key: 'wall', label: 'Wall' },
              { key: 'mine', label: 'Mine' },
              ...(canModerate ? [{ key: 'review' as const, label: `Review${pending.length ? ` (${pending.length})` : ''}` }] : []),
            ] as const
          ).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key as typeof tab)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === item.key ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </Section>

      <Section className="pb-6">
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <Quote className="mx-auto h-8 w-8 text-muted-foreground" aria-hidden />
            <p className="mt-3 font-medium">
              {tab === 'review'
                ? 'Nothing waiting for review'
                : tab === 'mine'
                  ? 'You have not shared a testimony yet'
                  : 'No testimonies yet'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {tab === 'review'
                ? 'New submissions will appear here for approval.'
                : 'When someone shares what God has done, it will appear here.'}
            </p>
            {tab !== 'review' && (
              <Button className="mt-4" onClick={() => setComposing(true)}>
                Share your testimony
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {visible.map((t, index) => (
              <motion.article
                key={t.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(index * 0.05, 0.3) }}
                className="rounded-2xl border border-border bg-card p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-serif text-lg tracking-tight">{t.title}</h3>
                  <StatusBadge status={t.status} />
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">{t.body}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{t.isAnonymous ? 'Anonymous' : t.authorName ?? 'A member'}</span>
                  <span aria-hidden>·</span>
                  <span>{new Date(t.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  {t.visibility === 'public' && t.status === 'approved' && (
                    <Badge variant="outline" className="gap-1">
                      <Globe className="h-3 w-3" aria-hidden />
                      Public
                    </Badge>
                  )}
                </div>

                {t.status === 'rejected' && t.reviewNote && (
                  <p className="mt-3 rounded-xl bg-muted p-3 text-sm text-muted-foreground">
                    <span className="font-medium">Leader's note: </span>
                    {t.reviewNote}
                  </p>
                )}

                {canModerate && t.status === 'pending' && tab === 'review' && (
                  <div className="mt-4 flex gap-2 border-t border-border pt-3">
                    <Button
                      size="sm"
                      className="flex-1 gap-1.5"
                      onClick={async () => {
                        try {
                          await review(t.id, 'approved');
                          toast.success('Approved. It is now visible to the cell.');
                        } catch (err) {
                          toast.error(err instanceof ApiError ? err.message : 'Could not approve.');
                        }
                      }}
                    >
                      <Check className="h-4 w-4" aria-hidden />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 gap-1.5"
                      onClick={async () => {
                        const note = window.prompt('Why is this not being published? (optional)');
                        if (note === null) return;
                        try {
                          await review(t.id, 'rejected', note);
                          toast.success('Declined. The author has been told.');
                        } catch (err) {
                          toast.error(err instanceof ApiError ? err.message : 'Could not decline.');
                        }
                      }}
                    >
                      <X className="h-4 w-4" aria-hidden />
                      Decline
                    </Button>
                  </div>
                )}

                {t.isMine && t.status !== 'rejected' && (
                  <div className="mt-3 border-t border-border pt-3">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={async () => {
                        if (!window.confirm('Withdraw this testimony? It will be removed.')) return;
                        try {
                          await withdraw(t.id);
                          toast.success('Testimony withdrawn.');
                        } catch (err) {
                          toast.error(err instanceof ApiError ? err.message : 'Could not withdraw.');
                        }
                      }}
                    >
                      Withdraw
                    </Button>
                  </div>
                )}
              </motion.article>
            ))}
          </div>
        )}
      </Section>

      {/* Signed-in name is only used to reassure the author who is posting. */}
      {user && !composing && (
        <Section className="pb-8">
          <p className="text-center text-xs text-muted-foreground">
            Sharing as {user.name}
          </p>
        </Section>
      )}

      <BottomNavigation />
    </MobileLayout>
  );
}

function StatusBadge({ status }: { status: 'pending' | 'approved' | 'rejected' }) {
  const map = {
    pending: { label: 'Awaiting review', className: 'bg-warning/15 text-warning-foreground' },
    approved: { label: 'Published', className: 'bg-success/15 text-success' },
    rejected: { label: 'Not published', className: 'bg-muted text-muted-foreground' },
  } as const;
  const config = map[status];
  return <Badge variant="outline" className={`shrink-0 ${config.className}`}>{config.label}</Badge>;
}
