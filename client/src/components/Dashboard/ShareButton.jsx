import { useState } from 'react';

// "Score card" — draws a shareable summary image from a report on a canvas and
// downloads it as a PNG. No content leaves the device (it's rendered locally);
// no new dependencies (pure canvas 2D, same approach as the app icons). The
// point is spread: a clean card a user can post after a good take.

const CREAM = '#faf8f3';
const SAND = '#f1ece2';
const INK = '#2b2622';
const BRAND = '#e0714f';
const EMERALD = '#10b981';

export default function ShareButton({ results }) {
  const [busy, setBusy] = useState(false);

  async function makeCard() {
    setBusy(true);
    try {
      const blob = await drawCard(results);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'speakable-score.png';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={makeCard}
      disabled={busy}
      className="flex items-center gap-1.5 rounded-full border border-sand bg-white px-3 py-1.5 text-xs font-semibold text-ink/70 transition-colors duration-250 hover:text-ink hover:border-brand-200 disabled:opacity-50"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0-12l-4 4m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" />
      </svg>
      {busy ? 'Saving…' : 'Score card'}
    </button>
  );
}

function drawCard(results) {
  const S = 1080;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const score = results.feedback?.overallScore ?? 0;

  // Background
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, S, S);

  // Wordmark: coral chip + "Speakable"
  const chipX = 96;
  const chipY = 92;
  roundRect(ctx, chipX, chipY, 60, 60, 16);
  ctx.fillStyle = BRAND;
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = '600 34px Georgia, serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'center';
  ctx.fillText('S', chipX + 30, chipY + 32);
  ctx.fillStyle = INK;
  ctx.font = '600 40px Georgia, serif';
  ctx.textAlign = 'left';
  ctx.fillText('Speakable', chipX + 78, chipY + 32);

  // Score ring
  const cx = S / 2;
  const cy = 430;
  const r = 150;
  ctx.lineWidth = 24;
  ctx.lineCap = 'round';
  ctx.strokeStyle = SAND;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = score >= 8 ? EMERALD : BRAND;
  ctx.beginPath();
  ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + (score / 10) * Math.PI * 2);
  ctx.stroke();

  // Score number
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.font = '600 130px Georgia, serif';
  ctx.fillText(String(score), cx, cy - 6);
  ctx.fillStyle = 'rgba(43,38,34,0.45)';
  ctx.font = '400 34px Georgia, serif';
  ctx.fillText('/ 10', cx, cy + 78);
  ctx.fillStyle = 'rgba(43,38,34,0.45)';
  ctx.font = '600 22px Helvetica Neue, Arial, sans-serif';
  ctx.fillText('OVERALL SCORE', cx, cy + 150);

  // Stats row (only the ones we have)
  const stats = [];
  if (results.avgWpm) stats.push([`${results.avgWpm}`, 'WPM']);
  const wordCount = results.words?.length || 0;
  const fillerTotal = Object.values(results.fillerWordCounts || {}).reduce((a, b) => a + b, 0);
  if (wordCount) stats.push([`${Math.round((fillerTotal / wordCount) * 1000) / 10}%`, 'fillers']);
  if (results.eyeContact?.contactPct != null) stats.push([`${results.eyeContact.contactPct}%`, 'eye contact']);

  const rowY = 720;
  const gap = S / (stats.length + 1);
  stats.forEach(([value, label], i) => {
    const x = gap * (i + 1);
    ctx.fillStyle = INK;
    ctx.font = '600 54px Georgia, serif';
    ctx.fillText(value, x, rowY);
    ctx.fillStyle = 'rgba(43,38,34,0.45)';
    ctx.font = '500 24px Helvetica Neue, Arial, sans-serif';
    ctx.fillText(label, x, rowY + 46);
  });

  // Verdict line (short, from the plain assessment)
  const focus = results.feedback?.assessment?.focus;
  const verdict = focus && focus.length ? `Working on: ${focus.join(', ')}` : 'Every measured area on target.';
  ctx.fillStyle = 'rgba(43,38,34,0.65)';
  ctx.font = '400 28px Helvetica Neue, Arial, sans-serif';
  wrapText(ctx, verdict, cx, 850, S - 220, 38);

  // Footer
  ctx.fillStyle = BRAND;
  ctx.font = '600 26px Helvetica Neue, Arial, sans-serif';
  ctx.fillText('speakable-omega.vercel.app', cx, 1000);

  return new Promise((resolve) => c.toBlob((b) => resolve(b), 'image/png'));
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(ctx, text, cx, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  const lines = [];
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  lines.slice(0, 2).forEach((l, i) => ctx.fillText(l, cx, y + i * lineH));
}
