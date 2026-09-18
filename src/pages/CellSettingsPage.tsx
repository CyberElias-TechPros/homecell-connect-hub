import { useEffect, useState } from 'react';
import { MobileLayout, PageHeader, Section } from '@/components/layout/MobileLayout';
import { BottomNavigation } from '@/components/layout/BottomNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { api, ApiError } from '@/lib/api';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { Video, Loader2, Info, Eye, EyeOff } from 'lucide-react';

interface Homecell {
  id: string;
  name: string;
  code: string;
  meeting_day: string | null;
  meeting_time: string | null;
  timezone: string;
  meeting_link: string | null;
  meeting_platform: string | null;
  meeting_passcode: string | null;
  join_instructions: string | null;
  public_join_enabled: number;
  auto_approve_members: number;
}

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const PLATFORMS = [
  { value: 'google_meet', label: 'Google Meet' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'jitsi', label: 'Jitsi' },
  { value: 'other', label: 'Other' },
];

/**
 * How the cell meets.
 *
 * The platform links out to Zoom / Google Meet / Jitsi — this application does
 * not host video. Whether the link is published to the public page is the
 * leader's decision and is stored per cell, never assumed.
 */
export function CellSettingsPage() {
  const { user } = useAuth();
  const homecellId = user?.homecellId ?? '';

  const [cell, setCell] = useState<Homecell | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPasscode, setShowPasscode] = useState(false);
  const [form, setForm] = useState({
    meeting_day: 'sunday',
    meeting_time: '18:00',
    timezone: 'Africa/Lagos',
    meeting_platform: 'google_meet',
    meeting_link: '',
    meeting_passcode: '',
    join_instructions: '',
    public_join_enabled: false,
    auto_approve_members: false,
  });

  useEffect(() => {
    if (!homecellId) {
      setIsLoading(false);
      setError('You are not assigned to a cell.');
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await api.get<{ homecell: Homecell }>(
          `/api/hierarchy/homecell/${encodeURIComponent(homecellId)}`,
        );
        if (cancelled) return;
        const h = data.homecell;
        setCell(h);
        setForm({
          meeting_day: h.meeting_day ?? 'sunday',
          meeting_time: h.meeting_time ?? '18:00',
          timezone: h.timezone ?? 'Africa/Lagos',
          meeting_platform: h.meeting_platform ?? 'google_meet',
          meeting_link: h.meeting_link ?? '',
          meeting_passcode: h.meeting_passcode ?? '',
          join_instructions: h.join_instructions ?? '',
          public_join_enabled: h.public_join_enabled === 1,
          auto_approve_members: h.auto_approve_members === 1,
        });
      } catch (err) {
        if (!cancelled) setError(err instanceof ApiError ? err.message : 'We could not load your cell.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [homecellId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/api/hierarchy/homecell/${encodeURIComponent(homecellId)}/meeting`, {
        meetingDay: form.meeting_day,
        meetingTime: form.meeting_time,
        timezone: form.timezone,
        meetingPlatform: form.meeting_platform,
        // Empty string means "clear this", not "leave unchanged".
        meetingLink: form.meeting_link.trim() || null,
        meetingPasscode: form.meeting_passcode.trim() || null,
        joinInstructions: form.join_instructions.trim() || null,
        publicJoinEnabled: form.public_join_enabled,
        autoApproveMembers: form.auto_approve_members,
      });
      toast.success('Your cell settings have been saved.');
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'We could not save your changes.');
    } finally {
      setSaving(false);
    }
  };

  const publicUrl = cell ? `${window.location.origin}/cell/${cell.code}` : '';

  if (isLoading) {
    return (
      <MobileLayout>
        <PageHeader title="Cell settings" subtitle="How your cell meets" />
        <Section className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </Section>
        <BottomNavigation />
      </MobileLayout>
    );
  }

  if (error || !cell) {
    return (
      <MobileLayout>
        <PageHeader title="Cell settings" />
        <Section>
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="font-medium">{error ?? 'We could not load your cell.'}</p>
          </div>
        </Section>
        <BottomNavigation />
      </MobileLayout>
    );
  }

  return (
    <MobileLayout>
      <PageHeader title="Cell settings" subtitle={cell.name} />

      <form onSubmit={handleSave}>
        {/* Schedule */}
        <Section className="pb-5">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">When you meet</h2>
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <div>
              <label htmlFor="cs-day" className="block text-sm font-medium">
                Day
              </label>
              <select
                id="cs-day"
                value={form.meeting_day}
                onChange={(e) => setForm({ ...form, meeting_day: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm capitalize outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
              >
                {DAYS.map((d) => (
                  <option key={d} value={d} className="capitalize">
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cs-time" className="block text-sm font-medium">
                Start time
              </label>
              <Input
                id="cs-time"
                type="time"
                value={form.meeting_time}
                onChange={(e) => setForm({ ...form, meeting_time: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="cs-tz" className="block text-sm font-medium">
                Time zone
              </label>
              <Input
                id="cs-tz"
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                placeholder="Africa/Lagos"
                className="mt-1.5"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Members see the meeting time converted to their own device's time zone.
              </p>
            </div>
          </div>
        </Section>

        {/* Meeting link */}
        <Section className="pb-5">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Video className="h-4 w-4" aria-hidden />
            Where you meet
          </h2>
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <div>
              <label htmlFor="cs-platform" className="block text-sm font-medium">
                Platform
              </label>
              <select
                id="cs-platform"
                value={form.meeting_platform}
                onChange={(e) => setForm({ ...form, meeting_platform: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25"
              >
                {PLATFORMS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="cs-link" className="block text-sm font-medium">
                Meeting link
              </label>
              <Input
                id="cs-link"
                type="url"
                value={form.meeting_link}
                onChange={(e) => setForm({ ...form, meeting_link: e.target.value })}
                placeholder="https://meet.google.com/abc-defg-hij"
                className="mt-1.5"
              />
            </div>
            <div>
              <label htmlFor="cs-pass" className="block text-sm font-medium">
                Passcode <span className="text-muted-foreground">(optional)</span>
              </label>
              <div className="relative mt-1.5">
                <Input
                  id="cs-pass"
                  type={showPasscode ? 'text' : 'password'}
                  value={form.meeting_passcode}
                  onChange={(e) => setForm({ ...form, meeting_passcode: e.target.value })}
                  className="pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode((v) => !v)}
                  aria-label={showPasscode ? 'Hide passcode' : 'Show passcode'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showPasscode ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                </button>
              </div>
            </div>
            <div>
              <label htmlFor="cs-instructions" className="block text-sm font-medium">
                Joining note <span className="text-muted-foreground">(optional)</span>
              </label>
              <Input
                id="cs-instructions"
                value={form.join_instructions}
                onChange={(e) => setForm({ ...form, join_instructions: e.target.value })}
                placeholder="e.g. Please join muted, cameras optional"
                maxLength={200}
                className="mt-1.5"
              />
            </div>
          </div>
        </Section>

        {/* Public joining */}
        <Section className="pb-5">
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">Who can join</h2>
          <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={form.public_join_enabled}
                onChange={(e) => setForm({ ...form, public_join_enabled: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-primary"
              />
              <span className="text-sm">
                <span className="font-medium">Show the meeting link on the public page</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  Anyone who visits your cell's page can open the meeting directly, without waiting
                  for a leader. Leave this off if your link contains a passcode you would rather not
                  publish.
                </span>
              </span>
            </label>

            <label className="flex cursor-pointer items-start gap-3 border-t border-border pt-3">
              <input
                type="checkbox"
                checked={form.auto_approve_members}
                onChange={(e) => setForm({ ...form, auto_approve_members: e.target.checked })}
                className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-primary"
              />
              <span className="text-sm">
                <span className="font-medium">Approve new members automatically</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  People who register are added straight away. Turn this off to review each request
                  yourself before they can see cell content.
                </span>
              </span>
            </label>

            {!form.auto_approve_members && (
              <div className="flex items-start gap-2 rounded-xl bg-muted p-3 text-xs text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>
                  With approval switched off, a register request waits for you to accept it. Members
                  you add yourself are always active immediately.
                </span>
              </div>
            )}
          </div>
        </Section>

        {/* The public page address */}
        {publicUrl && (
          <Section className="pb-5">
            <h2 className="mb-2 text-sm font-medium text-muted-foreground">Your public page</h2>
            <div className="rounded-2xl border border-border bg-card p-4">
              <code className="block overflow-x-auto text-xs">{publicUrl}</code>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(publicUrl);
                    toast.success('Link copied.');
                  } catch {
                    toast.info('Copy the link from the box above.');
                  }
                }}
              >
                Copy link
              </Button>
            </div>
          </Section>
        )}

        <Section className="pb-8">
          <Button type="submit" disabled={saving} className="w-full gap-2">
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
        </Section>
      </form>

      <BottomNavigation />
    </MobileLayout>
  );
}
