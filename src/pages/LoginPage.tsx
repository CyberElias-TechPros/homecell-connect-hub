import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api';
import { Loader2, AlertCircle, Info } from 'lucide-react';

type Mode = 'password' | 'otp';

export function LoginPage() {
  const navigate = useNavigate();
  const { login, requestOtp, verifyOtp, isAuthenticated, isReady, isLoading } = useAuth();

  const [mode, setMode] = useState<Mode>('password');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [otpStage, setOtpStage] = useState<'request' | 'verify'>('request');
  const [notice, setNotice] = useState<{ tone: 'info' | 'error'; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isReady && isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isReady, isAuthenticated, navigate]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setNotice(null);
    try {
      await login(identifier, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setNotice({
        tone: 'error',
        message: err instanceof ApiError ? err.message : 'We could not sign you in.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setNotice(null);
    try {
      const result = await requestOtp(phone);
      setOtpStage('verify');
      // Be honest about whether a message was actually sent rather than
      // implying delivery that did not happen.
      setNotice({
        tone: 'info',
        message: result.messagingConfigured
          ? result.message
          : 'No SMS provider is configured on this deployment, so a code was not actually sent. Check the API logs for the code.',
      });
    } catch (err) {
      setNotice({
        tone: 'error',
        message: err instanceof ApiError ? err.message : 'We could not send a code.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setNotice(null);
    try {
      await verifyOtp(phone, code);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setNotice({
        tone: 'error',
        message: err instanceof ApiError ? err.message : 'That code could not be verified.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const busy = submitting || isLoading;

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md"
      >
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back
        </Link>

        <header className="mt-6">
          <h1 className="font-serif text-3xl tracking-tight">Welcome back</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to see your cell, meetings and follow-ups.
          </p>
        </header>

        {/* Mode switch */}
        <div className="mt-6 inline-flex rounded-full border border-border bg-muted/50 p-1">
          <button
            type="button"
            onClick={() => { setMode('password'); setNotice(null); }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              mode === 'password' ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Password
          </button>
          <button
            type="button"
            onClick={() => { setMode('otp'); setNotice(null); }}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              mode === 'otp' ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Phone code
          </button>
        </div>

        {notice && (
          <div
            role="alert"
            className={`mt-6 flex items-start gap-3 rounded-xl border p-4 text-sm ${
              notice.tone === 'error'
                ? 'border-destructive/30 bg-destructive/10 text-destructive'
                : 'border-border bg-muted/50 text-foreground'
            }`}
          >
            {notice.tone === 'error' ? (
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
            ) : (
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0" aria-hidden />
            )}
            <span>{notice.message}</span>
          </div>
        )}

        {mode === 'password' ? (
          <form onSubmit={handlePasswordLogin} className="mt-6 space-y-5" noValidate>
            <div>
              <label htmlFor="identifier" className="block text-sm font-medium">
                Phone number or email
              </label>
              <input
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                required
                className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25 focus:ring-offset-1"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25 focus:ring-offset-1"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground transition-transform hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {busy ? 'Signing you in…' : 'Sign in'}
            </button>
          </form>
        ) : otpStage === 'request' ? (
          <form onSubmit={handleRequestOtp} className="mt-6 space-y-5" noValidate>
            <div>
              <label htmlFor="otp-phone" className="block text-sm font-medium">
                Phone number
              </label>
              <input
                id="otp-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                required
                placeholder="0803 123 4567"
                className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25 focus:ring-offset-1"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                We will send a 6-digit code to this number.
              </p>
            </div>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Send me a code
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="mt-6 space-y-5" noValidate>
            <div>
              <label htmlFor="otp-code" className="block text-sm font-medium">
                6-digit code
              </label>
              <input
                id="otp-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                className="mt-1.5 w-full rounded-xl border border-input bg-card px-4 py-3 text-center font-mono text-2xl tracking-[0.4em] outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/25 focus:ring-offset-1"
              />
            </div>
            <button
              type="submit"
              disabled={busy || code.length !== 6}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Verify and sign in
            </button>
            <button
              type="button"
              onClick={() => { setOtpStage('request'); setCode(''); setNotice(null); }}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground"
            >
              Use a different number
            </button>
          </form>
        )}

        <p className="mt-8 text-center text-sm text-muted-foreground">
          New here?{' '}
          <Link to="/join/HC1" className="font-medium text-foreground underline underline-offset-4">
            Request to join a cell
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
