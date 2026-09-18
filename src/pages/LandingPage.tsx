import { useEffect, useState, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { api, ApiError } from '@/lib/api';
import { nextWeeklyMeeting, countdownTo, formatMeetingTime } from '@/lib/datetime';
import { Users, CalendarDays, Video, ArrowRight, Sparkles, HeartHandshake, BookOpen } from 'lucide-react';

interface PublicCell {
  id: string;
  name: string;
  code: string;
  address: string | null;
  meetingDay: string | null;
  meetingTime: string | null;
  timezone: string;
  meetingPlatform: string | null;
  description: string | null;
  welcomeMessage: string | null;
  leaderName: string | null;
  memberCount: number;
  canJoinNow: boolean;
}

const DEFAULT_CELL_CODE = (import.meta.env.VITE_CELL_CODE as string | undefined) ?? 'HC1';

export function LandingPage() {
  const { code } = useParams<{ code?: string }>();
  const cellCode = code ?? DEFAULT_CELL_CODE;
  const reduceMotion = useReducedMotion();

  const [cell, setCell] = useState<PublicCell | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get<PublicCell>(`/api/public/cell/${encodeURIComponent(cellCode)}`)
      .then((data) => {
        if (!cancelled) {
          setCell(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : 'We could not load this cell.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [cellCode]);

  // Tick the countdown once a second, but only while there is a schedule.
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const nextMeeting = useMemo(
    () => (cell ? nextWeeklyMeeting(cell.meetingDay, cell.meetingTime, cell.timezone, now) : null),
    [cell, now],
  );
  const countdown = useMemo(() => countdownTo(nextMeeting, now), [nextMeeting, now]);

  if (loading) return <LandingSkeleton />;

  if (error || !cell) {
    return (
      <CenteredMessage
        title="We couldn't find that cell"
        body={error ?? 'The link may be incorrect, or the cell may no longer be meeting.'}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* ---------------------------------------------------------------- */}
      {/* Hero                                                              */}
      {/* ---------------------------------------------------------------- */}
      <section className="relative isolate overflow-hidden bg-primary text-primary-foreground">
        {/* Atmospheric light — decorative only, removed for reduced motion */}
        {!reduceMotion && (
          <div aria-hidden className="pointer-events-none absolute inset-0">
            <motion.div
              className="absolute -top-40 -right-24 h-[32rem] w-[32rem] rounded-full opacity-25 blur-3xl"
              style={{ background: 'radial-gradient(circle, hsl(38 92% 50%) 0%, transparent 70%)' }}
              animate={{ scale: [1, 1.15, 1], opacity: [0.18, 0.28, 0.18] }}
              transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute -bottom-32 -left-20 h-[26rem] w-[26rem] rounded-full opacity-20 blur-3xl"
              style={{ background: 'radial-gradient(circle, hsl(222 60% 55%) 0%, transparent 70%)' }}
              animate={{ scale: [1.1, 1, 1.1], opacity: [0.14, 0.22, 0.14] }}
              transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>
        )}

        <div className="relative mx-auto max-w-5xl px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
          <motion.div
            initial={reduceMotion ? false : { opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-medium tracking-wide backdrop-blur-sm">
              <Sparkles className="h-3.5 w-3.5 text-secondary" aria-hidden />
              An online cell community
            </span>

            <h1 className="mt-6 font-serif text-4xl leading-[1.1] tracking-tight sm:text-6xl">
              {cell.name}
            </h1>

            {cell.welcomeMessage ? (
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-primary-foreground/85 sm:text-xl">
                {cell.welcomeMessage}
              </p>
            ) : (
              <p className="mt-6 max-w-2xl text-lg leading-relaxed text-primary-foreground/85 sm:text-xl">
                A place to belong, grow in the Word, and walk with others — wherever you are in the world.
              </p>
            )}

            {/* Next meeting + countdown */}
            {nextMeeting ? (
              <div className="mt-10 rounded-2xl border border-white/15 bg-white/[0.07] p-6 backdrop-blur-sm sm:max-w-lg">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-secondary">
                  <CalendarDays className="h-4 w-4" aria-hidden />
                  Next meeting
                </div>
                <p className="mt-2 font-serif text-xl">
                  {formatMeetingTime(nextMeeting, cell.timezone)}
                </p>
                {!countdown.started ? (
                  <div className="mt-4 flex gap-3" role="timer" aria-live="off">
                    <CountdownUnit value={countdown.days} label="days" />
                    <CountdownUnit value={countdown.hours} label="hrs" />
                    <CountdownUnit value={countdown.minutes} label="min" />
                    <CountdownUnit value={countdown.seconds} label="sec" />
                  </div>
                ) : (
                  <p className="mt-4 text-sm font-medium text-secondary">
                    We are meeting right now.
                  </p>
                )}
                <p className="mt-3 text-xs text-primary-foreground/60">
                  Shown in {cell.timezone.replace('_', ' ')}
                </p>
              </div>
            ) : (
              <div className="mt-10 rounded-2xl border border-white/15 bg-white/[0.07] p-6 sm:max-w-lg">
                <p className="text-sm text-primary-foreground/80">
                  This cell has not published its meeting schedule yet. You can still ask to join and
                  your leader will be in touch.
                </p>
              </div>
            )}

            {/* Primary call to action */}
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link
                to={`/join/${cell.code}`}
                className="group inline-flex items-center gap-2 rounded-full bg-secondary px-7 py-3.5 text-sm font-semibold text-secondary-foreground shadow-lg transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-primary active:scale-[0.99]"
              >
                Join our cell
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
              <Link
                to="/login"
                className="rounded-full border border-white/25 px-6 py-3.5 text-sm font-medium transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                I already have an account
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-primary-foreground/70">
              <span className="inline-flex items-center gap-2">
                <Users className="h-4 w-4" aria-hidden />
                {cell.memberCount} {cell.memberCount === 1 ? 'member' : 'members'}
              </span>
              {cell.leaderName && (
                <span className="inline-flex items-center gap-2">
                  <HeartHandshake className="h-4 w-4" aria-hidden />
                  Led by {cell.leaderName}
                </span>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* What happens here                                                 */}
      {/* ---------------------------------------------------------------- */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="font-serif text-3xl tracking-tight text-foreground sm:text-4xl">
          What happens here
        </h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          {cell.description ??
            'Our cell is a small community that meets every week to pray together, study the Word, and support one another.'}
        </p>

        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          <FeatureCard
            icon={<Video className="h-5 w-5" aria-hidden />}
            title="We meet online"
            body="Join from wherever you are. No travel, no pressure — just bring yourself."
          />
          <FeatureCard
            icon={<BookOpen className="h-5 w-5" aria-hidden />}
            title="We grow in the Word"
            body="Weekly Bible study with notes and discussion, at a pace everyone can follow."
          />
          <FeatureCard
            icon={<HeartHandshake className="h-5 w-5" aria-hidden />}
            title="We look out for each other"
            body="Prayer, follow-up and practical care. If you miss a week, someone will reach out."
          />
        </div>
      </section>

      {/* ---------------------------------------------------------------- */}
      {/* Closing call to action                                            */}
      {/* ---------------------------------------------------------------- */}
      <section className="border-t border-border bg-muted/40">
        <div className="mx-auto max-w-5xl px-6 py-16 text-center">
          <h2 className="font-serif text-2xl tracking-tight sm:text-3xl">
            You would be welcome to join us
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Fill in a short form and your cell leader will confirm your place. You can always ask
            questions first — there is no obligation.
          </p>
          <Link
            to={`/join/${cell.code}`}
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.99]"
          >
            Request to join
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <p className="text-center text-xs text-muted-foreground">
          {cell.name} · A cell community meeting online
        </p>
      </footer>
    </div>
  );
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex min-w-[3.25rem] flex-col items-center rounded-xl bg-white/10 px-3 py-2">
      <span className="font-serif text-2xl tabular-nums leading-none">
        {String(value).padStart(2, '0')}
      </span>
      <span className="mt-1 text-[0.625rem] uppercase tracking-wider text-primary-foreground/60">
        {label}
      </span>
    </div>
  );
}

function FeatureCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/15 text-secondary-foreground">
        {icon}
      </div>
      <h3 className="mt-4 font-serif text-lg tracking-tight">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

function LandingSkeleton() {
  return (
    <div className="min-h-screen bg-background" aria-busy="true" aria-live="polite">
      <div className="bg-primary px-6 pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="mx-auto max-w-5xl animate-pulse space-y-6">
          <div className="h-7 w-52 rounded-full bg-white/15" />
          <div className="h-14 w-3/4 rounded-lg bg-white/15" />
          <div className="h-5 w-2/3 rounded bg-white/10" />
          <div className="h-40 w-full max-w-lg rounded-2xl bg-white/10" />
        </div>
      </div>
      <span className="sr-only">Loading cell details…</span>
    </div>
  );
}

function CenteredMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <h1 className="font-serif text-2xl tracking-tight sm:text-3xl">{title}</h1>
      <p className="mt-3 max-w-md text-muted-foreground">{body}</p>
      <Link
        to="/login"
        className="mt-8 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground"
      >
        Go to sign in
      </Link>
    </div>
  );
}
