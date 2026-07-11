import { useRef, useState, useCallback } from 'react';
import { countHesitations } from '../utils/fillerWords.js';

export function useSpeechRecognition() {
  const recognitionRef = useRef(null);
  const wordsRef = useRef([]);
  const startTimeRef = useRef(null);
  const runningRef = useRef(false); // true while we WANT recognition active
  const pausedRef = useRef(false); // ignore results while the user has paused
  const stopResolveRef = useRef(null);
  // Hesitations ("um"/"uh"…) live in INTERIM hypotheses but get scrubbed from
  // finals — and Whisper drops them too (see utils/fillerWords.js). We track the
  // per-result MAX count of each label (interims replace each other, so summing
  // would over-count), commit on final/restart, and timestamp each new one.
  const hesActiveRef = useRef(new Map()); // resultIndex → { label: maxCount }
  const hesCommittedRef = useRef({}); // { label: count } from finished results
  const hesEventsRef = useRef([]); // [{ label, at }] seconds since start
  const supported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  // Fold every active result's counts into the committed totals (a result is
  // done when it finalizes — or when the recognizer restarts and reuses indices).
  const commitHesitations = (index = null) => {
    for (const [i, counts] of [...hesActiveRef.current.entries()]) {
      if (index !== null && i !== index) continue;
      for (const [label, n] of Object.entries(counts)) {
        hesCommittedRef.current[label] = (hesCommittedRef.current[label] || 0) + n;
      }
      hesActiveRef.current.delete(i);
    }
  };

  const hesitationCounts = () => {
    const total = { ...hesCommittedRef.current };
    for (const counts of hesActiveRef.current.values()) {
      for (const [label, n] of Object.entries(counts)) total[label] = (total[label] || 0) + n;
    }
    return total;
  };

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
    hesActiveRef.current = new Map();
    hesCommittedRef.current = {};
    hesEventsRef.current = [];
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
          commitHesitations(i); // interim hesitations survive the final's scrub
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
          const hypothesis = result[0].transcript;
          interimText += hypothesis;
          // New hesitations in this hypothesis (beyond this result's known max)
          // get an event with a rough timestamp for cluster analysis.
          const counts = countHesitations(hypothesis);
          const known = hesActiveRef.current.get(i) || {};
          for (const [label, n] of Object.entries(counts)) {
            const prev = known[label] || 0;
            if (n > prev) {
              for (let k = prev; k < n; k++) hesEventsRef.current.push({ label, at: now });
              known[label] = n;
            }
          }
          hesActiveRef.current.set(i, known);
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
      commitHesitations(); // restart resets result indices — bank active counts first
      if (runningRef.current) {
        try {
          recognition.start();
        } catch {
          // Already (re)starting — safe to ignore.
        }
      } else {
        stopResolveRef.current?.(buildResult());
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

  // Everything the recorder needs at stop time: the fallback transcript plus
  // the interim-captured hesitations (counts + rough timestamps).
  const buildResult = () => {
    commitHesitations();
    return {
      words: wordsRef.current,
      hesitations: { counts: hesitationCounts(), events: hesEventsRef.current },
    };
  };

  // Stop for good: flip intent off so onend resolves (instead of restarting),
  // then wait for that final onend so the last words are included.
  const stop = useCallback(() => {
    return new Promise((resolve) => {
      const recognition = recognitionRef.current;
      if (!recognition) {
        resolve({ words: [], hesitations: { counts: {}, events: [] } });
        return;
      }
      runningRef.current = false;
      stopResolveRef.current = resolve;
      // Safety net in case onend never fires.
      setTimeout(() => {
        if (stopResolveRef.current) {
          stopResolveRef.current(buildResult());
          stopResolveRef.current = null;
        }
      }, 1500);
      try {
        recognition.stop();
      } catch {
        resolve(buildResult());
        stopResolveRef.current = null;
      }
    });
  }, []);

  return { start, stop, setPaused, liveWords, interim, supported };
}
