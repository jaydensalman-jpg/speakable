import { useRef, useCallback } from 'react';

export function useAudioAnalyzer() {
  const contextRef = useRef(null);
  const analyserRef = useRef(null);
  const intervalRef = useRef(null);
  const levelsRef = useRef([]);
  const startTimeRef = useRef(null);

  const connect = useCallback((stream) => {
    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    contextRef.current = ctx;
    analyserRef.current = analyser;
    levelsRef.current = [];
    startTimeRef.current = Date.now();

    const data = new Uint8Array(analyser.frequencyBinCount);

    intervalRef.current = setInterval(() => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      levelsRef.current.push({
        t: (Date.now() - startTimeRef.current) / 1000,
        db: avg,
      });
    }, 100);
  }, []);

  const disconnect = useCallback(() => {
    clearInterval(intervalRef.current);
    contextRef.current?.close();
    return levelsRef.current;
  }, []);

  // Expose current levels for the live visualizer canvas
  const getAnalyser = useCallback(() => analyserRef.current, []);

  return { connect, disconnect, getAnalyser };
}
