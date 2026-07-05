import { useRef, useState, useCallback } from 'react';

export function useSpeechRecognition() {
  const recognitionRef = useRef(null);
  const wordsRef = useRef([]);
  const startTimeRef = useRef(null);
  const runningRef = useRef(false); // true while we WANT recognition active
  const pausedRef = useRef(false); // ignore results while the user has paused
  const stopResolveRef = useRef(null);
  const supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  // Live view for the UI: recent finalized words (with absolute index for stable
  // keys, so only newly-arrived words animate in) + the current interim phrase.
  const [liveWords, setLiveWords] = useState([]);
  const [interim, setInterim] = useState('');

  const start = useCallback(() => {
    if (!supported) {
      console.warn('Web Speech API not supported; live captions unavailable.');
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    wordsRef.current = [];
    startTimeRef.current = Date.now();
    runningRef.current = true;
    pausedRef.current = false;
    setLiveWords([]);
    setInterim('');

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      if (pausedRef.current) return;
      const now = (Date.now() - startTimeRef.current) / 1000;
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = result[0].transcript.trim();
          if (!text) continue;
          // Recognizer confidence (0–1) — proxy for articulation; 0/undefined → null.
          const rawConf = result[0].confidence;
          const confidence = typeof rawConf === 'number' && rawConf > 0 ? rawConf : null;
          const words = text.split(/\s+/).filter(Boolean);
          const windowDuration = words.length / 2.5;
          words.forEach((word, idx) => {
            const cleaned = word.toLowerCase().replace(/[^a-z']/g, '');
            if (!cleaned) return;
            const estimatedStart = now - windowDuration + (idx / words.length) * windowDuration;
            wordsRef.current.push({
              word: cleaned,
              start: Math.max(0, estimatedStart),
              end: estimatedStart + 0.3,
              confidence,
            });
          });
        } else {
          interimText += result[0].transcript;
        }
      }
      setLiveWords(wordsRef.current.map((w, i) => ({ ...w, i })).slice(-28));
      setInterim(interimText.trim());
    };

    recognition.onerror = (e) => {
      // Permission errors are fatal — don't loop-restart. Everything else
      // (no-speech, network blips, aborted) is recoverable via onend → restart.
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        runningRef.current = false;
      }
    };

    // Chrome ends recognition on its own (silence, internal timeouts). While we're
    // still recording, immediately restart so the WHOLE talk gets transcribed.
    recognition.onend = () => {
      if (runningRef.current) {
        try {
          recognition.start();
        } catch {
          // Already (re)starting — safe to ignore.
        }
      } else {
        stopResolveRef.current?.(wordsRef.current);
        stopResolveRef.current = null;
      }
    };

    recognition.start();
  }, [supported]);

  // Freeze/unfreeze live capture while the user pauses the take.
  const setPaused = useCallback((paused) => {
    pausedRef.current = paused;
    if (!paused) setInterim('');
  }, []);

  // Stop for good: flip intent off so onend resolves (instead of restarting),
  // then wait for that final onend so the last words are included.
  const stop = useCallback(() => {
    return new Promise((resolve) => {
      const recognition = recognitionRef.current;
      if (!recognition) {
        resolve([]);
        return;
      }
      runningRef.current = false;
      stopResolveRef.current = resolve;
      // Safety net in case onend never fires.
      setTimeout(() => {
        if (stopResolveRef.current) {
          stopResolveRef.current(wordsRef.current);
          stopResolveRef.current = null;
        }
      }, 1500);
      try {
        recognition.stop();
      } catch {
        resolve(wordsRef.current);
        stopResolveRef.current = null;
      }
    });
  }, []);

  return { start, stop, setPaused, liveWords, interim, supported };
}
