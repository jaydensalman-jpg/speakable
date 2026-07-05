import { useEffect, useRef } from 'react';

const BAR_COUNT = 60;

export default function AudioVisualizer({ getAnalyser, isActive }) {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!isActive) {
      cancelAnimationFrame(rafRef.current);
      drawIdle(ctx, canvas.width, canvas.height);
      return;
    }

    // Gradient computed once, reused each frame
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, 'rgba(224, 113, 79, 0.9)');
    gradient.addColorStop(1, 'rgba(239, 168, 144, 0.45)');

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

      ctx.fillStyle = gradient;
      for (let i = 0; i < BAR_COUNT; i++) {
        const v = data[i * step] / 255;
        const h = Math.max(3, v * canvas.height);
        ctx.fillRect(i * (barW + 1), canvas.height - h, barW, h);
      }

      rafRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(rafRef.current);
  }, [isActive, getAnalyser]);

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
  ctx.fillStyle = 'rgba(225, 217, 203, 0.9)';
  for (let i = 0; i < BAR_COUNT; i++) {
    ctx.fillRect(i * (barW + 1), h - 3, barW, 3);
  }
}
