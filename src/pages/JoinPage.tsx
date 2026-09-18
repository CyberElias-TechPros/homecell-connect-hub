import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth, type RegisterInput } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api';
import { Users, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

/**
 * Registration / "join this cell" page.
 *
 * Reached either from the landing page (/join/:code) or from an invitation
 * link (?invite=<token>). An invitation takes precedence because it already
 * binds the person to a specific cell and role.
 */
export function JoinPage() {
  const { code } = useParams<{ code?: string }>();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite') ?? undefined;
  const navigate = useNavigate();
  const { register, isAuthenticated, isReady } = useAuth();

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    city: '',
    isFirstTimer: false,
    consentDataProcessing: false,
    consentWhatsapp: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ nextStep: string; pending: boolean } | null>(null);

  useEffect(() => {
    if (isReady && isAuthenticated && !success) {
      navigate('/dashboard', { replace: true });
    }
  }, [isReady, isAuthenticated, success, navigate]);

  const update = (key: keyof typeof form, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    const payload: RegisterInput = {
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      password: form.password,
      city: form.city.trim() || undefined,
      isFirstTimer: form.isFirstTimer,
      consentDataProcessing: form.consentDataProcessing,
      consentWhatsapp: form.consentWhatsapp,
      inviteToken,
    };

    try {
      const result = await register(payload);
      setSuccess({ nextStep: result.nextStep, pending: result.nextStep.includes('approval') });
    } catch (err) {
      if (err instanceof ApiError) {
        setFieldErrors(err.fieldErrors);
        // Only show the banner when the message is not already attached to a
        // specific field, to avoid saying the same thing twice.
        if (Object.keys(err.fieldErrors).length === 0) setFormError(err.message);
        else if (err.code === 'CONFLICT') setFormError(err.message);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-sm"
        >
          <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full bg-success/15">
            <CheckCircle2 className="h-7 w-7 text-success" aria-hidden />
          </div>
          <h1 className="mt-5 font-serif text-2xl tracking-tight">
            {success.pending ? 'Request received' : 'Welcome to the cell'}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{success.nextStep}</p>
          <Link
            to="/dashboard"
            className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01]"
          >
            Continue
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 py-12 sm:py-16">
      <div className="mx-auto w-full max-w-lg">
        <Link to={code ? `/${code}` : '/'} className="text-sm text-muted-foreground hover:text-foreground">
          ← Back
        </Link>

        <header className="mt-6">
          <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-secondary-foreground">
            <Users className="h-4 w-4" aria-hidden />
            Join the cell
          </div>
          <h1 className="mt-3 font-serif text-3xl tracking-tight">Tell us about yourself</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            A few details so your cell leader can welcome you properly. It takes under a minute.
          </p>
        </header>

        {formError && (
          <div
            role="alert"
            className="mt-6 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 space-y-5" noValidate>
          <Field
            label="Full name"
            id="name"
            required
            value={form.name}
            error={fieldErrors.name}
            onChange={(v) => update('name', v)}
            autoComplete="name"
          />
          <Field
            label="Phone number"
            id="phone"
            type="tel"
            value={form.phone}
            error={fieldErrors.phone}
            onChange={(v) => update('phone', v)}
            hint="Nigerian numbers can be entered as 0803…, or use +country format."
            autoComplete="tel"
          />
          <Field
            label="Email address"
            id="email"
            type="email"
            value={form.email}
            error={fieldErrors.email}
            onChange={(v) => update('email', v)}
            hint="Optional if you have given a phone number."
            autoComplete="email"
          />
          <Field
            label="Password"
            id="password"
            type="password"
            required
            value={form.password}
            error={fieldErrors.password}
            onChange={(v) => update('password', v)}
            hint="At least 8 characters."
            autoComplete="new-password"
          />
          <Field
            label="City"
            id="city"
            value={form.city}
            error={fieldErrors.city}
            onChange={(v) => update('city', v)}
            hint="Optional — helps your leader know your time zone."
            autoComplete="address-level2"
          />

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4 transition-colors hover:bg-muted/50">
            <input
              type="checkbox"
              checked={form.isFirstTimer}
              onChange={(e) => update('isFirstTimer', e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-primary"
            />
            <span className="text-sm">
              <span className="font-medium">This is my first time joining a cell</span>
              <span className="mt-0.5 block text-muted-foreground">
                We will make sure somebody personally follows up with you.
              </span>
            </span>
          </label>

          <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                required
                checked={form.consentDataProcessing}
                onChange={(e) => update('consentDataProcessing', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-primary"
                aria-describedby="consent-help"
              />
              <span className="text-sm">
                <span className="font-medium">
                  I agree to my details being stored and used to run this cell.
                </span>
                <span id="consent-help" className="mt-0.5 block text-muted-foreground">
                  Your information is visible only to the leaders of this cell. You can ask for a
                  copy or deletion at any time.
                </span>
              </span>
            </label>
            {fieldErrors.consentDataProcessing && (
              <p className="text-xs text-destructive">{fieldErrors.consentDataProcessing}</p>
            )}

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={form.consentWhatsapp}
                onChange={(e) => update('consentWhatsapp', e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-input text-primary focus:ring-primary"
              />
              <span className="text-sm">
                <span className="font-medium">You may contact me on WhatsApp</span>
                <span className="mt-0.5 block text-muted-foreground">
                  Optional. You will still receive in-app messages without this.
                </span>
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {submitting ? 'Sending your request…' : 'Request to join'}
          </button>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-foreground underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}

function Field({ label, id, value, onChange, error, hint, type = 'text', required, autoComplete }: FieldProps) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ');
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        required={required}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        className={`mt-1.5 w-full rounded-xl border bg-card px-4 py-3 text-sm outline-none transition-colors focus:ring-2 focus:ring-offset-1 ${
          error
            ? 'border-destructive focus:border-destructive focus:ring-destructive/30'
            : 'border-input focus:border-primary focus:ring-primary/25'
        }`}
      />
      {hint && !error && (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
