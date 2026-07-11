import { HeroGeometric } from '../ui/shape-landing-hero.jsx';
import { InteractiveHoverButton } from '../ui/interactive-hover-button.jsx';

// Deliberately spare: one headline, one action, one visual anchor — now staged
// on the HeroGeometric backdrop (floating warm-glass shapes, framer-motion
// entrance). The preview card still shows what the product does better than
// copy can; the CTA/tagline/preview ride the hero's third entrance beat.
export default function Home({ onStart }) {
  return (
    <HeroGeometric badge="Private · on-device coaching" title1="See how you" title2="actually speak.">
      <div className="flex flex-col items-center text-center">
        <InteractiveHoverButton onClick={onStart} text="Start recording" className="mt-9 px-8 py-3.5 text-base" />

        <p className="mt-4 text-xs text-ink/40">Three minutes. Recordings never leave your device.</p>

        <div className="relative mt-12 w-full max-w-md">
          <div className="absolute -inset-10 -z-10 rounded-full bg-brand-200/25 blur-3xl" />
          <ReportPreview />
        </div>
      </div>
    </HeroGeometric>
  );
}

// A quiet glimpse of the report — score, pace, fillers, voice.
function ReportPreview() {
  return (
    <div className="animate-float">
      <div className="overflow-hidden rounded-3xl border border-sand bg-white shadow-soft">
        <div className="flex items-center gap-1.5 border-b border-sand px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
        </div>
        <div className="flex items-center gap-4 p-5">
          <ScoreDonut value={8.4} />
          <div className="grid flex-1 grid-cols-2 gap-2">
            <Chip label="Pace" value="142 WPM" />
            <Chip label="Fillers" value="2.1%" />
          </div>
        </div>
        <div className="px-5 pb-5">
          <Waveform />
        </div>
      </div>
    </div>
  );
}

function ScoreDonut({ value }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const filled = (value / 10) * c;
  return (
    <div className="relative h-[72px] w-[72px] shrink-0">
      <svg width="72" height="72" className="-rotate-90">
        <circle cx="36" cy="36" r={r} fill="none" stroke="#f1ece2" strokeWidth="7" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          stroke="#e0714f"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - filled}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-xl font-semibold leading-none text-ink">{value}</span>
        <span className="text-[10px] text-ink/40">/10</span>
      </div>
    </div>
  );
}

function Chip({ label, value }) {
  return (
    <div className="rounded-xl bg-cream px-3 py-2 text-left">
      <p className="text-[11px] font-medium text-ink/45">{label}</p>
      <p className="text-sm font-semibold text-ink tabular-nums">{value}</p>
    </div>
  );
}

const BARS = [
  0.35, 0.6, 0.45, 0.8, 0.55, 1, 0.5, 0.7, 0.4, 0.85, 0.6, 0.95, 0.5, 0.65, 0.4, 0.75, 0.55, 0.9,
  0.45, 0.7, 0.5, 0.85, 0.4, 0.6, 0.5, 0.8,
];
function Waveform() {
  return (
    <div className="flex h-10 items-center justify-between rounded-xl bg-cream px-3">
      {BARS.map((h, i) => (
        <span
          key={i}
          className="animate-eq w-1 rounded-full bg-brand-400/80"
          style={{ height: `${h * 70 + 18}%`, animationDelay: `${i * 70}ms` }}
        />
      ))}
    </div>
  );
}
