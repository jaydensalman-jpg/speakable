import { useTheme } from '../../lib/theme.js';

// Light / dark switch for the header.
//
// A real switch (role="switch"), not a button that swaps an icon: the thumb's
// side tells you the state at a glance and one tap or Space/Enter flips it.
// Styled after the 3D explainer video: in dark the track is a glass pill with
// a white hairline and the thumb is the glowing coral disc the video uses for
// its record button; in light it is the same control in the cream palette.
export default function ThemeSwitch({ className = '' }) {
  const { isDark, toggle } = useTheme();

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Dark mode"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      onClick={toggle}
      className={`group relative inline-flex h-8 w-[3.5rem] shrink-0 items-center rounded-full border p-[3px] transition-colors duration-250 ease-organic ${
        isDark
          ? 'border-white/25 bg-white/[0.1] shadow-soft'
          : 'border-sand bg-surface'
      } ${className}`}
    >
      {/* Both icons sit in the track; the thumb covers the active side. */}
      <span className="pointer-events-none absolute inset-0 flex items-center justify-between px-[0.5rem] text-muted" aria-hidden="true">
        <SunIcon className="h-3.5 w-3.5" />
        <MoonIcon className="h-3.5 w-3.5" />
      </span>

      <span
        aria-hidden="true"
        className={`relative z-10 grid h-6 w-6 place-items-center rounded-full transition-all duration-400 ease-organic ${
          isDark
            ? 'translate-x-6 bg-brand-500 text-onbrand'
            : 'translate-x-0 bg-card text-brand-500 shadow-soft ring-1 ring-sand'
        }`}
      >
        {isDark ? <MoonIcon className="h-3.5 w-3.5" /> : <SunIcon className="h-3.5 w-3.5" />}
      </span>
    </button>
  );
}

function SunIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2.5 12h2M19.5 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function MoonIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round">
      <path d="M20.3 14.4A8.5 8.5 0 0 1 9.6 3.7a8.5 8.5 0 1 0 10.7 10.7Z" />
    </svg>
  );
}
