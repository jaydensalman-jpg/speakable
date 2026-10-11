import { useEffect, useRef } from 'react';
import { themeColor, useTheme } from '../../lib/theme.js';

const BAR_COUNT = 60;

export default function AudioVisualizer({ getAnalyser, isActive }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  // A canvas paints with literal colours, so it has to be told when the theme
  // changes; `theme` is in the effect's deps for exactly that.
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!isActive) {
      cancelAnimationFrame(rafRef.current);
      drawIdle(ctx, canvas.width, canvas.height);
      return;
    }

    // One flat coral, read once per effect run (theme is in the deps).
    const barColor = themeColor('brand-500', 0.9);

    const draw = () => {
      const analyser = getAnalyser();
      if (!analyser) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }

      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const step = Math.floor(data.length / BAR_COUNT);
      const barW = Math.floor(canvas.width / BAR_COUNT) - 1;

      ctx.fillStyle = barColor;
      for (let i = 0; i < BAR_COUNT; i++) {
        const v = data[i * step] / 255;
        const h = Math.max(3, v * canvas.height);
        ctx.fillRect(i * (barW + 1), canvas.height - h, barW, h);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [isActive, getAnalyser, theme]);

  return (
    <canvas
      ref={canvasRef}
      width={560}
      height={80}
      className="w-full h-20 rounded-2xl bg-cream"
    />
  );
}

function drawIdle(ctx, w, h) {
  ctx.clearRect(0, 0, w, h);
  const barW = Math.floor(w / BAR_COUNT) - 1;
  ctx.fillStyle = themeColor('sand', 0.9);
  for (let i = 0; i < BAR_COUNT; i++) {
    ctx.fillRect(i * (barW + 1), h - 3, barW, 3);
  }
}
