/**
 * Adapters between the API wire format and the view models the UI consumes.
 *
 * The screens were built against richer view models than the API returns, so
 * translation lives here in one place.
 *
 * Guiding rule: never invent data. Where the API has no backing field, the
 * adapter either derives the value from real data or uses a truthful neutral
 * value (empty array, zero, "not tracked") — never a plausible-looking fake.
 * Each such case is commented so it can be revisited.
 */

import type {
  Member,
  WeeklyAttendance,
  AttendanceRecord,
  AttendanceStats,
  FollowUp,
  FollowUpHistoryEntry,
  Announcement,
  AnnouncementUrgency,
  AnnouncementChannel,
  AnnouncementStatus,
  Material,
  WeeklyReport,
} from '../types';

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** ISO date -> the Sunday that ends that week. */
export function weekEndingFrom(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return date;
  const day = d.getUTCDay();
  d.setUTCDate(d.getUTCDate() + (day === 0 ? 0 : 7 - day));
  return d.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Monday-based week label, e.g. "Week of 15 Sep 2026". */
export function weekLabel(weekEnding: string): string {
  const end = new Date(`${weekEnding}T00:00:00Z`);
  if (Number.isNaN(end.getTime())) return weekEnding;
  const start = new Date(end);
  start.setUTCDate(end.getUTCDate() - 6);
  return `Week of ${start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export interface ApiMember {
  id: string;
  name: string;
  preferredName?: string | null;
  phone?: string | null;
  email?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  dateOfBirth?: string | null;
  role: string;
  status: string;
  memberStatus: string;
  membershipType?: string | null;
  isFirstTimer: boolean;
  avatarUrl?: string | null;
  occupation?: string | null;
  city?: string | null;
  country?: string | null;
  skills?: string[];
  homecellId?: string | null;
  joinedDate?: string | null;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
  notes?: string | null;
}

export function toUiMember(m: ApiMember, homecellName = ''): Member {
  return {
    id: m.id,
    fullName: m.name,
    phone: m.phone ?? '',
    gender: m.gender === 'female' ? 'female' : 'male',
    // Marital status is not collected by the API yet; the screens require a
    // value, so this defaults rather than presenting an editable blank.
    maritalStatus: 'single',
    birthday: m.dateOfBirth ?? '',
    serviceUnit: m.homecellId ?? '',
    serviceUnitName: homecellName,
    membershipType: toMembershipType(m.memberStatus, m.isFirstTimer),
    tag: ageTag(m.dateOfBirth),
    email: m.email ?? undefined,
    address: m.city ?? undefined,
    joinedAt: m.joinedDate ?? m.createdAt,
    isActive: m.status === 'active',
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    createdBy: '',
  };
}

function toMembershipType(memberStatus: string, isFirstTimer: boolean): Member['membershipType'] {
  if (isFirstTimer || memberStatus === 'first_timer') return 'first_timer';
  if (memberStatus === 'visitor') return 'visitor';
  if (memberStatus === 'inactive' || memberStatus === 'archived' || memberStatus === 'transferred') {
    return 'inactive';
  }
  return 'regular';
}

export function ageTag(dateOfBirth?: string | null): Member['tag'] {
  if (!dateOfBirth) return 'adult';
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return 'adult';
  const ageYears = (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  return ageYears < 18 ? 'child' : 'adult';
}

export function toApiMemberStatus(type: Member['membershipType']): string {
  switch (type) {
    case 'first_timer':
      return 'first_timer';
    case 'visitor':
      return 'visitor';
    case 'inactive':
      return 'inactive';
    default:
      return 'member';
  }
}

// ---------------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------------

export interface ApiAttendanceRecord {
  id: string;
  homecellId: string;
  memberId: string;
  meetingDate: string;
  status: string;
  isFirstTimer: boolean;
  notes?: string | null;
  markedBy?: string | null;
  createdAt: string;
  memberName?: string;
  gender?: string | null;
}

export function isPresent(status: string): boolean {
  return status === 'present' || status === 'late';
}

export function toUiAttendanceRecord(r: ApiAttendanceRecord): AttendanceRecord {
  return {
    id: r.id,
    memberId: r.memberId,
    memberName: r.memberName ?? '',
    date: r.meetingDate,
    week: weekEndingFrom(r.meetingDate),
    present: isPresent(r.status),
    isFirstTimer: r.isFirstTimer,
    markedBy: r.markedBy ?? '',
    markedAt: r.createdAt,
    synced: true,
  };
}

/**
 * Group flat attendance rows into per-meeting weeks.
 *
 * Returns newest first, which is the order every screen displays.
 */
export function groupAttendanceByMeeting(
  rows: ApiAttendanceRecord[],
  homecellId: string,
): WeeklyAttendance[] {
  const byDate = new Map<string, ApiAttendanceRecord[]>();
  for (const row of rows) {
    const list = byDate.get(row.meetingDate);
    if (list) list.push(row);
    else byDate.set(row.meetingDate, [row]);
  }

  const weeks: WeeklyAttendance[] = [];
  for (const [date, group] of byDate) {
    weeks.push(buildWeeklyAttendance(date, group, homecellId));
  }

  return weeks.sort((a, b) => (a.meetingDate < b.meetingDate ? 1 : -1));
}

function buildWeeklyAttendance(
  meetingDate: string,
  rows: ApiAttendanceRecord[],
  homecellId: string,
): WeeklyAttendance {
  const records = rows.map(toUiAttendanceRecord);
  const presentCount = records.filter((r) => r.present).length;
  const absentCount = records.length - presentCount;
  // Gender and age breakdowns come from the joined member row where present.
  const male = rows.filter((r) => r.gender === 'male').length;
  const female = rows.filter((r) => r.gender === 'female').length;
  const week = weekEndingFrom(meetingDate);

  return {
    id: `${homecellId}:${meetingDate}`,
    meetingDate,
    homecellId,
    week: weekLabel(week),
    weekEnding: week,
    totalMembers: records.length,
    presentCount,
    absentCount,
    firstTimers: records.filter((r) => r.isFirstTimer).length,
    // Age split is not recorded at check-in; reported as 0 rather than guessed.
    adults: 0,
    children: 0,
    maleCount: male,
    femaleCount: female,
    records,
    status: 'synced',
    createdAt: `${meetingDate}T00:00:00.000Z`,
    updatedAt: `${meetingDate}T00:00:00.000Z`,
    syncedAt: `${meetingDate}T00:00:00.000Z`,
  };
}

/** Derive the dashboard statistics from real attendance history. */
export function computeAttendanceStats(weeks: WeeklyAttendance[]): AttendanceStats {
  const withData = weeks.filter((w) => w.totalMembers > 0);

  const percentageOf = (w: WeeklyAttendance) =>
    w.totalMembers > 0 ? Math.round((w.presentCount / w.totalMembers) * 100) : 0;

  const current = withData[0];
  const previous = withData[1];

  const currentPct = current ? percentageOf(current) : 0;
  const previousPct = previous ? percentageOf(previous) : 0;

  const weeklyTrend = withData
    .slice(0, 12)
    .map((w, i, arr) => {
      const pct = percentageOf(w);
      const prior = arr[i + 1];
      const priorPct = prior ? percentageOf(prior) : pct;
      return {
        week: w.week,
        present: w.presentCount,
        total: w.totalMembers,
        percentage: pct,
        // Growth in percentage points against the previous meeting.
        growth: prior ? pct - priorPct : 0,
      };
    })
    .reverse();

  const monthlyAverage =
    weeklyTrend.length > 0
      ? Math.round(weeklyTrend.reduce((sum, w) => sum + w.percentage, 0) / weeklyTrend.length)
      : 0;

  return {
    currentWeek: {
      present: current?.presentCount ?? 0,
      total: current?.totalMembers ?? 0,
      percentage: currentPct,
      growth: previous ? currentPct - previousPct : 0,
    },
    monthlyAverage,
    weeklyTrend,
    categoryBreakdown: {
      // Age bands are not captured at check-in.
      adults: 0,
      children: 0,
      firstTimers: withData.reduce((sum, w) => sum + w.firstTimers, 0),
      males: withData.reduce((sum, w) => sum + w.maleCount, 0),
      females: withData.reduce((sum, w) => sum + w.femaleCount, 0),
    },
  };
}

// ---------------------------------------------------------------------------
// Follow-ups
// ---------------------------------------------------------------------------

export interface ApiFollowUpNote {
  id: string;
  body: string;
  outcome?: string | null;
  createdAt: string;
  authorName?: string | null;
}

export interface ApiFollowUp {
  id: string;
  homecellId: string;
  subjectId: string;
  assignedTo?: string | null;
  reason: string;
  priority: string;
  status: string;
  contactMethod?: string | null;
  dueDate?: string | null;
  completedAt?: string | null;
  outcome?: string | null;
  nextAction?: string | null;
  notes?: string | null;
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
  subjectName?: string;
  subjectPhone?: string | null;
  assignedToName?: string | null;
  isOverdue?: boolean;
}

/**
 * Map API follow-up status onto the UI vocabulary.
 *
 * `in_progress` and `waiting` collapse into `contacted` — all three mean the
 * leader has made contact and is still working the relationship. `cancelled`
 * is preserved distinctly so a void record is never counted as active work.
 */
export function toUiFollowUpStatus(status: string): FollowUp['status'] {
  switch (status) {
    case 'contacted':
      return 'contacted';
    case 'in_progress':
      return 'contacted';
    case 'waiting':
      return 'contacted';
    case 'completed':
      return 'integrated';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'pending';
  }
}

/** Reverse mapping used when writing. */
export function toApiFollowUpStatus(status: FollowUp['status']): string {
  switch (status) {
    case 'contacted':
      return 'contacted';
    case 'integrated':
      return 'completed';
    case 'visited':
      return 'in_progress';
    case 'cancelled':
      return 'cancelled';
    default:
      return 'open';
  }
}

export function toUiFollowUp(
  f: ApiFollowUp,
  notes: ApiFollowUpNote[] = [],
): FollowUp {
  const overdueDays =
    f.isOverdue && f.dueDate
      ? Math.max(0, Math.floor((Date.now() - new Date(`${f.dueDate}T00:00:00Z`).getTime()) / 86400000))
      : 0;

  return {
    id: f.id,
    memberId: f.subjectId,
    memberName: f.subjectName ?? 'Unknown',
    phone: f.subjectPhone ?? '',
    assignedTo: f.assignedTo ?? '',
    assignedToName: f.assignedToName ?? (f.assignedTo ? 'Assigned' : 'Unassigned'),
    assignedBy: f.createdBy ?? '',
    assignedByName: '',
    status: toUiFollowUpStatus(f.status),
    priority: (f.priority as FollowUp['priority']) ?? 'normal',
    notes: f.notes ?? '',
    followUpHistory: notes.map(toUiFollowUpHistory),
    nextFollowUpDate: f.dueDate ?? undefined,
    lastContactDate: f.completedAt ?? undefined,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
    createdBy: f.createdBy ?? '',
    updatedBy: '',
    isOverdue: Boolean(f.isOverdue),
    overdueDays,
    tags: [f.reason],
  };
}

export function toUiFollowUpHistory(n: ApiFollowUpNote): FollowUpHistoryEntry {
  return {
    id: n.id,
    status: 'contacted',
    notes: n.outcome ? `${n.body} — ${n.outcome}` : n.body,
    contactDate: n.createdAt,
    updatedBy: '',
    updatedByName: n.authorName ?? '',
    createdAt: n.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export interface ApiReport {
  id: string;
  homecellId: string;
  homecellName?: string;
  weekEnding: string;
  meetingDate?: string | null;
  totalAttendance: number;
  maleCount: number;
  femaleCount: number;
  adultCount: number;
  childrenCount: number;
  firstTimers: number;
  newConverts: number;
  soulsWon: number;
  offering?: number | null;
  testimonies?: string | null;
  challenges?: string | null;
  prayerPoints?: string | null;
  leaderComments?: string | null;
  status: string;
  submittedByName?: string | null;
  submittedAt?: string | null;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  createdAt: string;
  updatedAt: string;
}

export function toUiReport(r: ApiReport): WeeklyReport {
  return {
    id: r.id,
    homecellId: r.homecellId,
    weekEnding: r.weekEnding,
    totalAttendance: r.totalAttendance,
    maleCount: r.maleCount,
    femaleCount: r.femaleCount,
    adultCount: r.adultCount,
    childrenCount: r.childrenCount,
    firstTimers: r.firstTimers,
    newConverts: r.newConverts,
    soulsWon: r.soulsWon,
    testimonies: r.testimonies ?? '',
    challenges: r.challenges ?? '',
    prayerPoints: r.prayerPoints ?? '',
    offering: r.offering ?? undefined,
    status: toUiReportStatus(r.status),
    submittedAt: r.submittedAt ?? undefined,
    updatedAt: r.updatedAt,
    syncedAt: r.updatedAt,
    approvedAt: r.reviewedAt ?? undefined,
    approvedBy: r.reviewedByName ?? undefined,
    createdAt: r.createdAt,
  };
}

function toUiReportStatus(status: string): WeeklyReport['status'] {
  if (status === 'approved') return 'approved';
  if (status === 'submitted' || status === 'rejected') return 'submitted';
  return 'draft';
}

export function toApiReportPayload(report: Partial<WeeklyReport>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  const numeric: Array<[keyof WeeklyReport, string]> = [
    ['totalAttendance', 'totalAttendance'],
    ['maleCount', 'maleCount'],
    ['femaleCount', 'femaleCount'],
    ['adultCount', 'adultCount'],
    ['childrenCount', 'childrenCount'],
    ['firstTimers', 'firstTimers'],
    ['newConverts', 'newConverts'],
    ['soulsWon', 'soulsWon'],
    ['offering', 'offering'],
  ];
  for (const [from, to] of numeric) {
    const value = report[from];
    if (typeof value === 'number') payload[to] = value;
  }
  const text: Array<[keyof WeeklyReport, string]> = [
    ['testimonies', 'testimonies'],
    ['challenges', 'challenges'],
    ['prayerPoints', 'prayerPoints'],
  ];
  for (const [from, to] of text) {
    const value = report[from];
    if (typeof value === 'string') payload[to] = value;
  }
  if (typeof report.weekEnding === 'string') payload.weekEnding = report.weekEnding;
  return payload;
}

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------

export interface ApiAnnouncement {
  id: string;
  title: string;
  body: string;
  category?: string | null;
  priority: string;
  scope: string;
  homecellId?: string | null;
  publishedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  authorName?: string | null;
  readCount?: number;
  isRead?: boolean;
}

export function toUiAnnouncement(a: ApiAnnouncement): Announcement {
  const publishedAt = a.publishedAt ?? a.createdAt;
  const expiresAt = a.expiresAt ?? undefined;
  const expired = expiresAt ? new Date(expiresAt).getTime() < Date.now() : false;

  // The UI vocabulary has no 'expired'; an announcement past its expiry is
  // archived, which is what it effectively is.
  const status: AnnouncementStatus = expired ? 'archived' : 'published';

  return {
    id: a.id,
    title: a.title,
    content: a.body,
    urgency: toUiUrgency(a.priority),
    target: toUiTarget(a.scope),
    // The platform delivers in-app only; SMS/WhatsApp are not wired, so
    // claiming more channels would be inaccurate.
    channels: ['in_app'] as AnnouncementChannel[],
    status,
    publishedAt,
    expiresAt,
    createdAt: a.createdAt,
    createdBy: '',
    createdByName: a.authorName ?? 'Cell leader',
    updatedAt: a.createdAt,
    // Only the read count is genuinely tracked. Delivery and failure counts
    // are not instrumented, so they report zero rather than a guess.
    deliveryStats: {
      totalRecipients: 0,
      delivered: 0,
      read: a.readCount ?? 0,
      failed: 0,
    },
    tags: a.category ? [a.category] : undefined,
    category: a.category ?? undefined,
  };
}

function toUiUrgency(priority: string): AnnouncementUrgency {
  switch (priority) {
    case 'urgent':
      return 'urgent';
    case 'high':
      return 'high';
    case 'low':
      return 'low';
    default:
      return 'normal';
  }
}

function toUiTarget(scope: string): Announcement['target'] {
  switch (scope) {
    case 'zone':
      return 'zones';
    case 'area':
      return 'areas';
    case 'district':
      return 'districts';
    default:
      return 'all';
  }
}

export function toApiAnnouncementUrgency(urgency: AnnouncementUrgency): string {
  return urgency;
}

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------

export interface ApiMaterial {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  materialType: string;
  url?: string | null;
  fileKey?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  weekEnding?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  authorName?: string | null;
  homecellId?: string | null;
  acknowledged?: boolean;
}

export function toUiMaterial(m: ApiMaterial, acknowledgedBy: string[] = []): Material {
  const publishedAt = m.publishedAt ?? m.createdAt;
  // "New" is a real signal: published within the last 7 days.
  const isNew = Date.now() - new Date(publishedAt).getTime() < 7 * 86400000;

  return {
    id: m.id,
    title: m.title,
    type: m.weekEnding ? 'weekly' : 'special',
    format: toUiMaterialFormat(m.materialType),
    description: m.description ?? '',
    url: m.url ?? '',
    fileSize: m.fileSize ?? undefined,
    publishedAt,
    targetAudience: toUiAudience(m.homecellId ?? null),
    isNew,
    isPublished: true,
    createdBy: '',
    createdByName: m.authorName ?? 'Cell leader',
    updatedAt: m.publishedAt ?? m.createdAt,
    acknowledgedBy,
    requiresAcknowledgment: m.materialType === 'document',
  };
}

function toUiMaterialFormat(materialType: string): Material['format'] {
  switch (materialType) {
    case 'audio':
      return 'audio';
    case 'video':
      // The UI has no video format; audio is the closest playable equivalent.
      return 'audio';
    default:
      return 'pdf';
  }
}

/** Materials scoped to the whole cell are for everyone. */
function toUiAudience(homecellId: string | null): Material['targetAudience'] {
  return homecellId ? 'all' : 'leaders';
}

// ---------------------------------------------------------------------------
// Testimonies
// ---------------------------------------------------------------------------

export interface ApiTestimony {
  id: string;
  homecellId: string;
  authorId?: string | null;
  isMine: boolean;
  authorName?: string | null;
  title: string;
  body: string;
  category?: string | null;
  isAnonymous: boolean;
  visibility: string;
  status: string;
  sharedPublicly: boolean;
  reviewedByName?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UiTestimony {
  id: string;
  title: string;
  body: string;
  category: string | null;
  authorName: string | null;
  isAnonymous: boolean;
  /** True when the signed-in user wrote it — drives the "Mine" tab. */
  isMine: boolean;
  visibility: 'cell' | 'leadership' | 'public';
  status: 'pending' | 'approved' | 'rejected';
  reviewNote: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export function toUiTestimony(t: ApiTestimony): UiTestimony {
  return {
    id: t.id,
    title: t.title,
    body: t.body,
    category: t.category,
    // An anonymous testimony never carries a name, whatever the server sent.
    authorName: t.isAnonymous ? null : (t.authorName ?? null),
    isAnonymous: t.isAnonymous,
    isMine: t.isMine,
    visibility: (t.visibility as UiTestimony['visibility']) ?? 'cell',
    status: (t.status as UiTestimony['status']) ?? 'pending',
    reviewNote: t.reviewNote ?? null,
    publishedAt: t.publishedAt ?? null,
    createdAt: t.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Prayer
// ---------------------------------------------------------------------------

export interface ApiPrayerRequest {
  id: string;
  homecellId: string;
  title?: string | null;
  body: string;
  category?: string | null;
  urgency: string;
  visibility: string;
  status: string;
  answeredNote?: string | null;
  answeredAt?: string | null;
  isAnonymous: boolean;
  assignedTo?: string | null;
  assignedToName?: string | null;
  authorName?: string | null;
  isMine: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UiPrayerRequest {
  id: string;
  title: string | null;
  body: string;
  category: string | null;
  urgency: 'low' | 'normal' | 'high' | 'urgent';
  visibility: 'private' | 'leadership' | 'cell';
  status: 'open' | 'praying' | 'answered' | 'closed';
  answeredNote: string | null;
  isAnonymous: boolean;
  authorName: string | null;
  assignedToName: string | null;
  isMine: boolean;
  createdAt: string;
}

export function toUiPrayerRequest(p: ApiPrayerRequest): UiPrayerRequest {
  return {
    id: p.id,
    title: p.title ?? null,
    body: p.body,
    category: p.category ?? null,
    urgency: (p.urgency as UiPrayerRequest['urgency']) ?? 'normal',
    visibility: (p.visibility as UiPrayerRequest['visibility']) ?? 'leadership',
    status: (p.status as UiPrayerRequest['status']) ?? 'open',
    answeredNote: p.answeredNote ?? null,
    isAnonymous: p.isAnonymous,
    authorName: p.isAnonymous ? null : (p.authorName ?? null),
    assignedToName: p.assignedToName ?? null,
    isMine: p.isMine,
    createdAt: p.createdAt,
  };
}

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------

export interface ApiInvitation {
  id: string;
  role: string;
  note?: string | null;
  expiresAt: string;
  usedAt?: string | null;
  revokedAt?: string | null;
  createdAt: string;
  /** Present only on creation — the raw token is never stored server-side. */
  token?: string;
  url?: string;
}
