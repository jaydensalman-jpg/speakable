import { useState } from 'react';
import Home from './components/Home/index.jsx';
import Recorder from './components/Recorder/index.jsx';
import Dashboard from './components/Dashboard/index.jsx';
import History from './components/History/index.jsx';
import SegmentedNav from './components/ui/SegmentedNav.jsx';
import { detectFillerWords } from './utils/fillerWords.js';
import { computePacing } from './utils/pacing.js';
import { detectPauses } from './utils/pauses.js';
import { generateLocalFeedback } from './utils/localCoach.js';
import { transcribeLocally } from './lib/transcribe.js';
import { saveSession, toSession } from './lib/history.js';

// App states: home → idle (recorder) → recording → processing → results
// Keep a single Recorder mounted across idle/recording so the stream never drops.
export default function App() {
  const [appState, setAppState] = useState('home');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState('');

  async function handleRecordingComplete({ blob, words, volumeLevels, source, mediaType }) {
    setAppState('processing');
    setError(null);
    setProgress('Transcribing your speech…');

    try {
      // Transcribe the recorded audio with Whisper, in-browser. This processes the
      // full audio faithfully (incl. every "um"/"uh"), unlike the live dictation
      // engine which strips fillers. Falls back to the live transcript on failure.
      let transcript = '';
      let wordList = [];
      let audioDuration = 0;
      try {
        const result = await transcribeLocally(blob, {
          onProgress: (e) => {
            if (e.status === 'progress' && e.total) {
              setProgress(`Downloading model… ${Math.round(e.progress)}% (first run only)`);
            }
          },
          onStatus: (s) => {
            if (s === 'transcoding') setProgress('Reading the video’s audio (about the length of the clip)…');
            else if (s === 'transcribing') setProgress('Transcribing your speech…');
          },
        });
        transcript = result.transcript;
        wordList = result.words;
        audioDuration = result.audioDuration || 0;
      } catch (err) {
        console.error('Whisper failed, falling back to live transcript:', err);
        if (words && words.length) {
          wordList = words;
          transcript = words.map((w) => w.word).join(' ');
        } else if (source === 'upload') {
          const reason = err?.message ? ` (reason: ${err.message})` : '';
          throw new Error(
            `Could not read audio from that file${reason}. Try exporting it as MP4, M4A, MP3, or WAV with an audio track.`
          );
        } else {
          throw new Error(
            'Could not transcribe the recording. Please try again in Google Chrome with a working microphone.'
          );
        }
      }

      if (!wordList.length) {
        throw new Error('No speech detected. Record again and speak clearly.');
      }

      const duration = audioDuration > 0 ? audioDuration : (wordList.at(-1)?.end ?? 0);
      const fillerWordCounts = detectFillerWords(wordList);
      const { avgWpm, wpmData } = computePacing(wordList, duration);
      const pauses = detectPauses(wordList);
      const volumeStdDev = computeVolumeStdDev(volumeLevels);

      // Coaching is generated entirely on-device — no API key, no cost, fully private.
      const feedback = generateLocalFeedback({
        transcript,
        fillerWordCounts,
        avgWpm,
        wpmData,
        pauses,
        volumeStdDev,
        duration,
        words: wordList,
      });

      const fullResults = {
        transcript,
        words: wordList,
        fillerWordCounts,
        avgWpm,
        wpmData,
        pauses,
        volumeLevels,
        volumeStdDev,
        duration,
        feedback,
        // Same blob URL feeds both the muted-video and audio-only review players.
        mediaUrl: blob ? URL.createObjectURL(blob) : null,
        mediaType: mediaType ?? 'audio',
      };
      setResults(fullResults);
      setAppState('results');

      // Persist to the on-device practice history (calendar). Fire-and-forget.
      saveSession(toSession({ results: fullResults, blob, mediaType: mediaType ?? 'audio' })).catch((e) =>
        console.error('Could not save to history:', e)
      );
    } catch (err) {
      console.error(err);
      setError(err.message || 'Something went wrong. Please try again.');
      setAppState('idle');
    }
  }

  function handleReset() {
    if (results?.mediaUrl) URL.revokeObjectURL(results.mediaUrl);
    setResults(null);
    setError(null);
    setAppState('idle');
  }

  // Re-open a saved session's full report (recreate the playable blob URL).
  function openHistoryReport(session) {
    if (results?.mediaUrl) URL.revokeObjectURL(results.mediaUrl);
    setResults({
      ...session.results,
      mediaType: session.mediaType,
      mediaUrl: session.blob ? URL.createObjectURL(session.blob) : null,
    });
    setError(null);
    setAppState('results');
  }

  function goHome() {
    if (results?.mediaUrl) URL.revokeObjectURL(results.mediaUrl);
    setResults(null);
    setError(null);
    setAppState('home');
  }

  // Persistent nav: "Record" covers the whole record→report flow; "History" is the calendar.
  const navActive = appState === 'history' ? 'history' : 'record';
  function navTo(id) {
    if (id === 'history') setAppState('history');
    else handleReset(); // Record → fresh recorder
  }
  const showNav = appState !== 'recording' && appState !== 'processing';
  const NAV_ITEMS = [
    {
      id: 'record',
      label: 'Record',
      icon: (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 1a4 4 0 014 4v7a4 4 0 01-8 0V5a4 4 0 014-4zm-2 15.93A7 7 0 0019 12h2a9 9 0 01-18 0h2a7 7 0 006 6.93V21H9v2h6v-2h-2v-2.07z" />
        </svg>
      ),
    },
    {
      id: 'history',
      label: 'History',
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0V11.25A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-sand bg-cream/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <button onClick={goHome} className="flex items-center gap-2.5" aria-label="SpeakCoach home">
            <div className="w-7 h-7 rounded-xl bg-brand-500 flex items-center justify-center shadow-soft">
              <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 1a4 4 0 014 4v7a4 4 0 01-8 0V5a4 4 0 014-4zm-2 15.93A7 7 0 0019 12h2a9 9 0 01-18 0h2a7 7 0 006 6.93V21H9v2h6v-2h-2v-2.07z" />
              </svg>
            </div>
            <span className="font-display font-semibold text-ink text-[16px] tracking-tight">SpeakCoach</span>
          </button>
          {showNav && <SegmentedNav items={NAV_ITEMS} active={navActive} onChange={navTo} />}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {error && (
          <div className="mb-6 p-4 bg-brand-50 border border-brand-100 rounded-2xl text-brand-700 text-sm leading-relaxed">
            {error}
          </div>
        )}

        {appState === 'home' && (
          <Home onStart={() => setAppState('idle')} onHistory={() => setAppState('history')} />
        )}

        {appState === 'history' && (
          <History onOpenReport={openHistoryReport} onRecord={() => setAppState('idle')} />
        )}

        {/* Single Recorder instance for both idle and recording — prevents unmount mid-stream */}
        {(appState === 'idle' || appState === 'recording') && (
          <Recorder
            onComplete={handleRecordingComplete}
            onRecordingStart={() => setAppState('recording')}
          />
        )}

        {appState === 'processing' && <ProcessingState message={progress} />}

        {appState === 'results' && results && <Dashboard results={results} />}
      </main>
    </div>
  );
}

function ProcessingState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-40 gap-6">
      <div className="relative">
        <div className="w-14 h-14 rounded-full border-4 border-sand border-t-brand-500 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-brand-500" />
        </div>
      </div>
      <div className="text-center">
        <p className="text-lg font-semibold text-ink">Analyzing</p>
        <p className="text-sm text-ink/45 mt-1">{message || 'Transcribing · measuring pace · detecting fillers'}</p>
      </div>
    </div>
  );
}

function computeVolumeStdDev(levels) {
  if (!levels || levels.length === 0) return 0;
  const values = levels.map((l) => l.db);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}
