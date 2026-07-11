import { useState } from 'react';
import { InteractiveHoverButton } from '../ui/interactive-hover-button.jsx';

// Pre-recording email capture. Shown once, on the first "Start recording", and
// only when we don't already know who this is (no Supabase account, no saved
// email, no earlier guest choice) — recording itself is never blocked, "Continue
// as guest" always works. The email lands in state + localStorage (see App.jsx);
// pushing it to a backend/CRM would happen where App stores it. Note the real
// account system is Supabase sign-in — this is a lightweight tag, not auth.
export default function EmailGate({ onContinue, onGuest, onSignIn, canSignIn }) {
  const [email, setEmail] = useState('');
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  function handleSubmit(e) {
    e.preventDefault();
    if (valid) onContinue(email.trim());
  }

  return (
    <div className="animate-rise mx-auto flex min-h-[70vh] max-w-md flex-col justify-center py-10 text-center">
      <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-ink">
        Before you record
      </h1>
      <p className="mx-auto mt-3 max-w-sm text-ink/55">
        Leave an email to tag your practice sessions — or skip straight to recording. Either way,
        recordings never leave your device.
      </p>

      <form onSubmit={handleSubmit} className="card mt-8 flex flex-col gap-4 text-left">
        <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/35" htmlFor="gate-email">
          Email
        </label>
        <input
          id="gate-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="rounded-2xl border border-sand bg-cream px-4 py-3 text-[15px] text-ink placeholder:text-ink/30"
        />
        <InteractiveHoverButton type="submit" disabled={!valid} text="Continue" className="w-full px-6 py-3" />
        <button
          type="button"
          onClick={onGuest}
          className="rounded-full py-2 text-sm font-semibold text-ink/50 transition-colors duration-250 hover:text-ink/80"
        >
          Continue as guest
        </button>
      </form>

      {canSignIn && (
        <p className="mt-4 text-xs text-ink/40">
          Want your scores on every device?{' '}
          <button onClick={onSignIn} className="font-semibold text-brand-600 hover:text-brand-700">
            Sign in instead
          </button>
        </p>
      )}
    </div>
  );
}
