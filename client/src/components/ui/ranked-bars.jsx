// RankedBars — the Figma's `.ranked-list` / `.ranked-row`. A label, a bar scaled
// against the top row, and the count. Used by Filler Words' Breakdown and by
// Vocabulary's "Words you leaned on", exactly as in the design.
//
// `divided` applies the design's `.filler-breakdown` override: rows get taller
// with a hairline between them instead of the default gap.
export default function RankedBars({ rows, divided = false }) {
  if (!rows?.length) return null;
  const max = Math.max(...rows.map((r) => r[1])) || 1;

  return (
    <div className={divided ? 'mt-4' : 'mt-6 grid gap-3.5'}>
      {rows.map(([label, count]) => (
        <div
          key={label}
          className={`grid grid-cols-[5.5rem_1fr_1.5rem] items-center gap-3 sm:grid-cols-[7rem_1fr_2rem] sm:gap-4 ${
            divided ? 'min-h-[3.25rem] border-b border-sand py-3 last:border-b-0' : ''
          }`}
        >
          <span className="truncate text-[1.0625rem] text-ink">{label}</span>
          {/* .bar-track — bordered, faintly filled, so an empty bar still reads */}
          <div className="h-2.5 rounded border border-sand bg-sand/70">
            <span
              className="block h-full rounded-[0.2rem] bg-brand-500 transition-all duration-500"
              style={{ width: `${(count / max) * 100}%` }}
            />
          </div>
          <span className="text-right text-[0.8125rem] tabular-nums text-muted">{count}</span>
        </div>
      ))}
    </div>
  );
}
