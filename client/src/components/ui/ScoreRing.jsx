export default function ScoreRing({ score, size = 120, label = 'Overall' }) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = (score / 10) * circumference;
  const color =
    score >= 8 ? '#10b981' : score >= 6 ? '#e0714f' : score >= 4 ? '#f59e0b' : '#ef4444';

  return (
    <div className="flex flex-col items-center gap-2.5">
      {/* Relative container so the score text can be absolutely centered inside the SVG */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          style={{ display: 'block', transform: 'rotate(-90deg)' }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f1ece2"
            strokeWidth={strokeWidth}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - filled}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[2rem] font-semibold tracking-tight tabular-nums leading-none" style={{ color }}>
            {score}
          </span>
          <span className="text-sm text-ink/40 font-medium leading-none mt-1">/10</span>
        </div>
      </div>
      <span className="text-xs text-ink/50 font-medium uppercase tracking-wider">{label}</span>
    </div>
  );
}
