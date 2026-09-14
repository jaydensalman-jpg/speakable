import { useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate, useReducedMotion } from 'framer-motion';

// Overall score dial. The arc sweeps up and the number counts to the score on
// mount, over a segmented track so the ring reads as a gauge rather than a
// plain donut.
//
// Adapted from a shadcn/Next "Vo2Max" radial card: rewritten as JSX, with the
// shadcn tokens (bg-card, stroke-primary, text-muted-foreground) replaced by
// this app's warm palette. framer-motion is NOT covered by the global
// prefers-reduced-motion CSS rule, so the hook is checked here directly:
// reduced motion paints the final arc and number with no animation at all.
export default function ScoreRing({ score, size = 120, label = 'Overall' }) {
  const reduceMotion = useReducedMotion();

  const strokeWidth = 10;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const color =
    score >= 8 ? '#10b981' : score >= 6 ? '#e0714f' : score >= 4 ? '#f59e0b' : '#ef4444';

  // One motion value drives both the arc and the digit, so they can never
  // disagree about what the score is mid-animation.
  const progress = useMotionValue(reduceMotion ? score : 0);
  const shown = useTransform(progress, (v) => Math.round(v));
  const dashoffset = useTransform(progress, (v) => circumference - (v / 10) * circumference);

  useEffect(() => {
    if (reduceMotion) {
      progress.set(score);
      return undefined;
    }
    const run = animate(progress, score, { duration: 1.2, ease: [0.22, 1, 0.36, 1] });
    return () => run.stop();
  }, [score, progress, reduceMotion]);

  return (
    <div className="flex flex-col items-center gap-2.5">
      {/* Relative container so the score text can be absolutely centered inside the SVG */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          style={{ display: 'block', transform: 'rotate(-90deg)' }}
          role="img"
          aria-label={`${label}: ${score} out of 10`}
        >
          {/* Segmented track — dashes read as tick marks on a dial. */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f1ece2"
            strokeWidth={strokeWidth}
            strokeDasharray="3 7"
            strokeLinecap="round"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeLinecap="round"
            style={{ strokeDashoffset: dashoffset }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.span
            className="text-[2rem] font-semibold tracking-tight tabular-nums leading-none"
            style={{ color }}
          >
            {shown}
          </motion.span>
          <span className="text-sm text-ink/40 font-medium leading-none mt-1">/10</span>
        </div>
      </div>
      <span className="text-xs text-ink/50 font-medium uppercase tracking-wider">{label}</span>
    </div>
  );
}
