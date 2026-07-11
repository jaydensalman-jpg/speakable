import { useState } from 'react';
import { InteractiveHoverButton } from '../ui/interactive-hover-button.jsx';

// Sign-in / account screen. Three faces:
//  - cloud not configured → quiet explanation, nothing to do
//  - signed out → email form (magic link) → "check your email" confirmation
//  - signed in → account panel with the privacy split spelled out + sign out
export default function Account({ auth }) {
  const { configured, user, signIn, signOut } = auth;

  return (
    <div className="animate-rise mx-auto flex min-h-[70vh] max-w-md flex-col justify-center py-10">
      {!configured ? <NotConfigured /> : user ? <SignedIn user={user} onSignOut={signOut} /> : <SignInForm onSubmit={signIn} />}
    </div>
  );
}

function SignInForm({ onSubmit }) {
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | sent | error
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!valid || state === 'sending') return;
    setState('sending');
    try {
      await onSubmit(email.trim());
      setState('sent');
    } catch (err) {
      console.error('Sign-in failed:', err);
      setState('error');
    }
  }

  if (state === 'sent') {
    return (
      <div className="card text-center">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Check your email</h1>
        <p className="mt-3 text-sm leading-relaxed text-ink/55">
          We sent a sign-in link to <span className="font-semibold text-ink">{email}</span>. Open it on this
          device and you'll be signed in — no password.
        </p>
        <button
          onClick={() => setState('idle')}
          className="mt-6 text-sm font-semibold text-brand-600 hover:text-brand-700"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="text-center">
      <h1 className="font-display text-4xl font-semibold leading-tight tracking-tight text-ink">Sign in</h1>
      <p className="mx-auto mt-3 max-w-sm text-ink/55">
        Your scores follow you across devices. Recordings never leave the device they were made on.
      </p>

      <form onSubmit={handleSubmit} className="card mt-8 flex flex-col gap-4 text-left">
        <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/35" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="rounded-2xl border border-sand bg-cream px-4 py-3 text-[15px] text-ink placeholder:text-ink/30"
        />
        <InteractiveHoverButton
          type="submit"
          disabled={!valid || state === 'sending'}
          text={state === 'sending' ? 'Sending link…' : 'Email me a sign-in link'}
          className="w-full px-6 py-3"
        />
        {state === 'error' && (
          <p className="rounded-2xl border border-brand-100 bg-brand-50 p-3 text-sm leading-relaxed text-brand-700">
            Couldn't send the link. Check the address and your connection, then try again.
          </p>
        )}
        <p className="text-xs leading-relaxed text-ink/40">
          Signing in is optional — without an account, everything still works and stays in this browser.
        </p>
      </form>
    </div>
  );
}

function SignedIn({ user, onSignOut }) {
  return (
    <div className="text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-brand-500 font-display text-2xl font-semibold text-white shadow-soft">
        {(user.email?.[0] || '?').toUpperCase()}
      </div>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight text-ink">Your account</h1>
      <p className="mt-1 text-sm text-ink/55">{user.email}</p>

      <div className="card mt-8 text-left">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-ink/45">What syncs</h2>
        <ul className="mt-3 space-y-2 text-sm leading-relaxed text-ink/65">
          <li>Reports — scores, pacing, fillers, transcript, eye contact — sync to your account.</li>
          <li>Recordings stay on the device where they were made. They are never uploaded.</li>
        </ul>
      </div>

      <button
        onClick={onSignOut}
        className="mt-6 rounded-full bg-sand px-6 py-2.5 text-sm font-semibold text-ink/70 transition-colors duration-250 hover:bg-sand/70 hover:text-ink"
      >
        Sign out
      </button>
      <p className="mt-3 text-xs text-ink/40">Signing out keeps this device's recordings and reports in place.</p>
    </div>
  );
}

function NotConfigured() {
  return (
    <div className="card text-center">
      <h1 className="font-display text-3xl font-semibold tracking-tight text-ink">Accounts aren't set up yet</h1>
      <p className="mt-3 text-sm leading-relaxed text-ink/55">
        This build has no cloud configured, so everything stays in this browser — recordings and reports both.
        Once Supabase keys are added, signing in will sync your reports across devices.
      </p>
    </div>
  );
}
