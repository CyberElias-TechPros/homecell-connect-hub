import { z } from 'zod';
import { ApiError } from './errors';

/**
 * Normalise a phone number to E.164.
 *
 * Written for the primary deployment context (Nigeria) but tolerant of
 * international input. Returns null when the number cannot be normalised
 * confidently — callers should reject rather than guess.
 */
export function normalisePhone(input: string): string | null {
  if (!input) return null;
  let s = input.trim().replace(/[\s()\-.]/g, '');
  if (s.startsWith('00')) s = '+' + s.slice(2);

  if (s.startsWith('+')) {
    const digits = s.slice(1).replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 15 ? '+' + digits : null;
  }
  const digits = s.replace(/\D/g, '');
  // Nigerian local format: 0803..., 0703..., 0903... -> +234...
  if (digits.startsWith('0') && digits.length === 11) return '+234' + digits.slice(1);
  // Nigerian without trunk zero: 8031234567 -> +234...
  if (digits.length === 10 && /^[789]/.test(digits)) return '+234' + digits;
  // Already 234-prefixed
  if (digits.startsWith('234') && digits.length === 13) return '+' + digits;
  return null;
}

const phoneSchema = z
  .string()
  .trim()
  .min(7, 'Phone number is too short.')
  .max(32, 'Phone number is too long.')
  .transform((v, ctx) => {
    const normalised = normalisePhone(v);
    if (!normalised) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Enter a valid phone number.' });
      return z.NEVER;
    }
    return normalised;
  });

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email('Enter a valid email address.')
  .max(254);

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(200, 'Password is too long.');

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Please enter your name.').max(120),
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    password: passwordSchema,
    gender: z.enum(['male', 'female', 'other']).optional(),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.').optional(),
    city: z.string().trim().max(120).optional(),
    country: z.string().trim().max(120).optional(),
    occupation: z.string().trim().max(120).optional(),
    howHeard: z.string().trim().max(200).optional(),
    isFirstTimer: z.boolean().optional().default(false),
    /** Invitation token, when registering via a share link. */
    inviteToken: z.string().trim().max(200).optional(),
    /** Explicit consent is required before we store personal data. */
    consentDataProcessing: z.boolean(),
    consentWhatsapp: z.boolean().optional().default(false),
  })
  .refine((v) => Boolean(v.phone || v.email), {
    message: 'Provide either a phone number or an email address.',
    path: ['phone'],
  })
  .refine((v) => v.consentDataProcessing === true, {
    message: 'You must agree to the data processing terms to register.',
    path: ['consentDataProcessing'],
  });

export const loginSchema = z
  .object({
    identifier: z.string().trim().min(3, 'Enter your phone number or email.'),
    password: z.string().min(1, 'Enter your password.'),
  })
  .transform((v) => {
    // Support logging in with either identifier in the same field.
    const looksLikeEmail = v.identifier.includes('@');
    if (looksLikeEmail) {
      const parsed = emailSchema.safeParse(v.identifier);
      if (!parsed.success) throw ApiError.validation('Enter a valid email address.');
      return { email: parsed.data, phone: null as string | null, password: v.password };
    }
    const phone = normalisePhone(v.identifier);
    if (!phone) throw ApiError.validation('Enter a valid phone number or email address.');
    return { email: null as string | null, phone, password: v.password };
  });

export const requestOtpSchema = z.object({ phone: phoneSchema });

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  code: z.string().trim().regex(/^\d{6}$/, 'Enter the 6-digit code.'),
});

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  preferredName: z.string().trim().max(60).optional(),
  email: emailSchema.nullable().optional(),
  gender: z.enum(['male', 'female', 'other']).nullable().optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  country: z.string().trim().max(120).nullable().optional(),
  occupation: z.string().trim().max(120).nullable().optional(),
  address: z.string().trim().max(300).nullable().optional(),
  skills: z.array(z.string().trim().min(1).max(60)).max(30).optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password.'),
  newPassword: passwordSchema,
});

export const memberCreateSchema = z
  .object({
    name: z.string().trim().min(2, 'Please enter a name.').max(120),
    phone: phoneSchema.optional(),
    email: emailSchema.optional(),
    gender: z.enum(['male', 'female', 'other']).optional(),
    dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    membershipType: z.enum(['new_convert', 'old_member']).optional(),
    isFirstTimer: z.boolean().optional().default(false),
    memberStatus: z
      .enum(['visitor', 'first_timer', 'member', 'worker', 'inactive', 'transferred', 'archived'])
      .optional(),
    occupation: z.string().trim().max(120).optional(),
    address: z.string().trim().max(300).optional(),
    city: z.string().trim().max(120).optional(),
    /** Optional: leader can set an initial password so the member can log in. */
    password: passwordSchema.optional(),
  })
  .refine((v) => Boolean(v.phone || v.email), {
    message: 'Provide a phone number or email.',
    path: ['phone'],
  });

export const memberUpdateSchema = z.object({
  name: z.string().trim().min(2).max(120).optional(),
  phone: phoneSchema.nullable().optional(),
  email: emailSchema.nullable().optional(),
  gender: z.enum(['male', 'female', 'other']).nullable().optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  membershipType: z.enum(['new_convert', 'old_member']).nullable().optional(),
  isFirstTimer: z.boolean().optional(),
  memberStatus: z
    .enum(['visitor', 'first_timer', 'member', 'worker', 'inactive', 'transferred', 'archived'])
    .optional(),
  role: z
    .enum(['member', 'leader', 'assistant', 'provider', 'zonal', 'area', 'district', 'admin', 'super_admin'])
    .optional(),
  occupation: z.string().trim().max(120).nullable().optional(),
  address: z.string().trim().max(300).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  notes: z.string().trim().max(2000).nullable().optional(),
});

export const attendanceMarkSchema = z.object({
  meetingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.'),
  records: z
    .array(
      z.object({
        memberId: z.string().min(1),
        status: z.enum(['present', 'absent', 'excused', 'first_timer', 'visitor', 'late']),
        notes: z.string().trim().max(500).optional(),
      }),
    )
    .min(1, 'No attendance records supplied.')
    .max(500, 'Too many records in one request.'),
});

export const reportCreateSchema = z.object({
  weekEnding: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD.'),
  meetingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  totalAttendance: z.number().int().min(0).max(100000).optional(),
  maleCount: z.number().int().min(0).max(100000).optional(),
  femaleCount: z.number().int().min(0).max(100000).optional(),
  adultCount: z.number().int().min(0).max(100000).optional(),
  childrenCount: z.number().int().min(0).max(100000).optional(),
  firstTimers: z.number().int().min(0).max(100000).optional(),
  newConverts: z.number().int().min(0).max(100000).optional(),
  soulsWon: z.number().int().min(0).max(100000).optional(),
  offering: z.number().int().min(0).max(1_000_000_000).optional(),
  testimonies: z.string().trim().max(4000).optional(),
  challenges: z.string().trim().max(4000).optional(),
  prayerPoints: z.string().trim().max(4000).optional(),
  leaderComments: z.string().trim().max(4000).optional(),
  submit: z.boolean().optional().default(false),
});

export const reportReviewSchema = z.object({
  decision: z.enum(['approved', 'rejected']),
  note: z.string().trim().max(2000).optional(),
});

export const announcementCreateSchema = z.object({
  title: z.string().trim().min(3, 'Give the announcement a title.').max(200),
  body: z.string().trim().min(3, 'Write the announcement body.').max(8000),
  category: z.string().trim().max(60).optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().default('normal'),
  scope: z.enum(['homecell', 'zone', 'area', 'district', 'global']).optional().default('homecell'),
  expiresAt: z.string().datetime().nullable().optional(),
});

export const materialCreateSchema = z.object({
  title: z.string().trim().min(3).max(200),
  description: z.string().trim().max(2000).optional(),
  category: z.string().trim().max(60).optional(),
  materialType: z.enum(['document', 'audio', 'video', 'link', 'image', 'other']).optional().default('document'),
  url: z.string().trim().url('Enter a valid URL.').max(2000).optional(),
  weekEnding: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const followUpCreateSchema = z.object({
  subjectId: z.string().min(1, 'Choose who this follow-up is for.'),
  assignedTo: z.string().min(1).nullable().optional(),
  reason: z.enum(['first_timer', 'new_convert', 'absentee', 'visitor', 'prayer_request', 'care', 'other']),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional().default('normal'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const followUpUpdateSchema = z.object({
  status: z.enum(['open', 'contacted', 'in_progress', 'waiting', 'completed', 'cancelled']).optional(),
  assignedTo: z.string().min(1).nullable().optional(),
  priority: z.enum(['low', 'normal', 'high', 'urgent']).optional(),
  contactMethod: z
    .enum(['call', 'whatsapp', 'sms', 'email', 'visit', 'in_person', 'other'])
    .nullable()
    .optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  outcome: z.string().trim().max(2000).nullable().optional(),
  nextAction: z.string().trim().max(1000).nullable().optional(),
  notes: z.string().trim().max(4000).nullable().optional(),
});

export const followUpNoteSchema = z.object({
  body: z.string().trim().min(1, 'Write a note.').max(4000),
  outcome: z.string().trim().max(500).optional(),
});

export const prayerCreateSchema = z.object({
  title: z.string().trim().max(200).optional(),
  body: z.string().trim().min(3, 'Please describe your prayer request.').max(4000),
  category: z.string().trim().max(60).optional(),
  urgency: z.enum(['low', 'normal', 'high', 'urgent']).optional().default('normal'),
  visibility: z.enum(['private', 'leadership', 'cell']).optional().default('leadership'),
  isAnonymous: z.boolean().optional().default(false),
});

export const prayerUpdateSchema = z.object({
  status: z.enum(['open', 'praying', 'answered', 'closed']).optional(),
  assignedTo: z.string().min(1).nullable().optional(),
  answeredNote: z.string().trim().max(4000).nullable().optional(),
});

export const invitationCreateSchema = z.object({
  role: z
    .enum(['member', 'leader', 'assistant', 'provider'])
    .optional()
    .default('member'),
  note: z.string().trim().max(300).optional(),
  expiresInDays: z.number().int().min(1).max(90).optional().default(14),
});

export const notificationReadSchema = z.object({
  ids: z.array(z.string().min(1)).max(200).optional(),
  all: z.boolean().optional().default(false),
});

/**
 * Parse with Zod, converting failures into a consistent ApiError whose
 * `details` map field paths to messages so forms can highlight inputs.
 */
export function parseOrThrow<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (result.success) return result.data;

  const fieldErrors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.') || '_';
    if (!fieldErrors[path]) fieldErrors[path] = issue.message;
  }
  const first = result.error.issues[0];
  throw ApiError.validation(first?.message ?? 'The information provided is not valid.', fieldErrors);
}
