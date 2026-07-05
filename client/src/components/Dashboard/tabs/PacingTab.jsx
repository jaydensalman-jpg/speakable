import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';

const IDEAL_LOW = 120;
const IDEAL_HIGH = 160;

export default function PacingTab({ results }) {
  const { avgWpm, wpmData, pauses } = results;

  const paceLabel =
    avgWpm < 100 ? 'Too slow'
    : avgWpm < 120 ? 'Slightly slow'
    : avgWpm <= 160 ? 'Ideal'
    : avgWpm <= 180 ? 'Slightly fast'
    : 'Too fast';

  const paceColorClass =
    avgWpm >= 120 && avgWpm <= 160
      ? 'text-emerald-600'
      : avgWpm >= 100 && avgWpm <= 180
      ? 'text-amber-600'
      : 'text-red-500';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card">
          <span className={`text-2xl font-bold tabular-nums ${paceColorClass}`}>{avgWpm}</span>
          <span className="text-xs text-ink/45 font-medium">Avg WPM</span>
        </div>
        <div className="stat-card">
          <span className={`text-lg font-bold ${paceColorClass}`}>{paceLabel}</span>
          <span className="text-xs text-ink/45 font-medium">Pace rating</span>
        </div>
        <div className="stat-card">
          <span className="text-2xl font-bold text-ink tabular-nums">{pauses.length}</span>
          <span className="text-xs text-ink/45 font-medium">Long pauses (2s+)</span>
        </div>
      </div>

      {wpmData.length > 1 ? (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-ink/80">Pace over time</h3>
            <span className="text-xs text-ink/45">per 10-second window</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={wpmData} margin={{ top: 5, right: 10, left: -15, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1ece2" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#a8a29e' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                domain={[0, 'auto']}
                tick={{ fontSize: 11, fill: '#a8a29e' }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 10,
                  border: '1px solid #f1ece2',
                  fontSize: 13,
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.07)',
                }}
                formatter={(v) => [`${v} WPM`, 'Pace']}
                labelStyle={{ color: '#78716c', fontSize: 12 }}
              />
              <ReferenceLine
                y={IDEAL_LOW}
                stroke="#10b981"
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />
              <ReferenceLine
                y={IDEAL_HIGH}
                stroke="#10b981"
                strokeDasharray="4 4"
                strokeWidth={1.5}
              />
              <Line
                type="monotone"
                dataKey="wpm"
                stroke="#e0714f"
                strokeWidth={2.5}
                dot={{ r: 3, fill: '#e0714f', strokeWidth: 0 }}
                activeDot={{ r: 5, fill: '#cb5a39' }}
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-ink/45 mt-3 flex items-center gap-1.5">
            <span className="inline-block w-5 border-t-2 border-dashed border-emerald-400" />
            Ideal range: 120–160 WPM
          </p>
        </div>
      ) : (
        <div className="card text-center py-10">
          <p className="text-sm text-ink/45">
            Not enough data for a pacing chart — requires multiple 10-second windows.
          </p>
        </div>
      )}

      {pauses.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-ink/80 mb-3">Long pauses detected</h3>
          <div className="space-y-2">
            {pauses.map((p, i) => (
              <div key={i} className="flex items-center gap-3 text-sm p-3 rounded-xl bg-cream">
                <span className="font-mono text-xs text-ink/45 shrink-0 tabular-nums w-10">
                  {formatTime(p.at)}
                </span>
                <span className="font-semibold text-ink/70 shrink-0">{p.duration}s</span>
                <span className="text-ink/45 text-xs truncate">
                  …"{p.before}" → "{p.after}"…
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(s) {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return m > 0 ? `${m}:${String(sec).padStart(2, '0')}` : `0:${String(sec).padStart(2, '0')}`;
}
