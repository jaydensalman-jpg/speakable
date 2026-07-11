// In-browser speech-to-text with OpenAI Whisper, via transformers.js.
// Runs entirely on the user's device — free, private, no API key — and transcribes
// the recorded/uploaded audio faithfully (including filler words the browser's live
// dictation engine drops). Model is downloaded once and cached by the browser.
//
// transformers.js (~MBs of WASM/ONNX runtime) is dynamically imported only when a
// recording is processed, so it never weighs down the initial page load.

// whisper-base.en captures filler words ("um", "uh", repeats) noticeably better than
// tiny — at the cost of a larger one-time download and slightly slower processing.
// On phones/tablets base.en is too heavy (~145 MB download + slow WASM inference,
// risk of iOS Safari memory kills), so they get tiny.en (~40 MB) instead.
// (iPadOS reports itself as "Mac" — the maxTouchPoints check catches it.)
const IS_MOBILE =
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform));
const MODEL_ID = IS_MOBILE ? 'Xenova/whisper-tiny.en' : 'Xenova/whisper-base.en';

let transcriberPromise = null;

// Lazily load the library + ASR pipeline (cached). onProgress gets download events.
function getTranscriber(onProgress) {
  if (!transcriberPromise) {
    transcriberPromise = import('@xenova/transformers')
      .then(({ pipeline, env }) => {
        env.allowLocalModels = false; // fetch model from the HF hub, cache in-browser
        return pipeline('automatic-speech-recognition', MODEL_ID, { progress_callback: onProgress });
      })
      .catch((err) => {
        transcriberPromise = null; // allow retry on failure
        throw err;
      });
  }
  return transcriberPromise;
}

// Convert an AudioBuffer to a mono 16 kHz Float32Array (what Whisper expects).
function bufferToMono16k(audioBuffer) {
  const channels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const mono = new Float32Array(length);
  for (let c = 0; c < channels; c++) {
    const data = audioBuffer.getChannelData(c);
    for (let i = 0; i < length; i++) mono[i] += data[i] / channels;
  }
  if (audioBuffer.sampleRate === 16000) return mono;
  const ratio = audioBuffer.sampleRate / 16000;
  const outLength = Math.floor(length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i++) {
    const idx = i * ratio;
    const i0 = Math.floor(idx);
    const i1 = Math.min(i0 + 1, length - 1);
    const frac = idx - i0;
    out[i] = mono[i0] * (1 - frac) + mono[i1] * frac;
  }
  return out;
}

// Fast path: let Web Audio decode the container directly (WebM/Opus from recordings,
// plus MP4/AAC, M4A, MP3, WAV, OGG, FLAC).
async function decodeViaWebAudio(blob) {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  const ctx = new AudioCtx();
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    return bufferToMono16k(audioBuffer);
  } finally {
    ctx.close();
  }
}

// Fallback for containers Web Audio can't parse (commonly .mov / iPhone video).
// Uses an <audio> element — it decodes ONLY the audio track, so an unsupported
// VIDEO codec (e.g. HEVC, which blocks a <video> element) no longer matters. The
// audio is routed through Web Audio and captured to PCM. Runs in real time.
function decodeViaMediaElement(blob) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const el = document.createElement('audio');
    el.src = url;
    el.preload = 'auto';
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();

    let settled = false;
    const finish = (fn) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      ctx.close().catch(() => {});
      fn();
    };
    const fail = (reason) => finish(() => reject(new Error(reason)));

    el.onerror = () => fail('browser-cannot-play-file');

    el.onloadedmetadata = async () => {
      try {
        await ctx.resume().catch(() => {});
        // Tap the decoded audio directly (independent of speaker output / mute state).
        const source = ctx.createMediaElementSource(el);
        const dest = ctx.createMediaStreamDestination();
        source.connect(dest); // NOT connected to ctx.destination → silent, just captured

        const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find((t) =>
          MediaRecorder.isTypeSupported(t)
        );
        const recorder = new MediaRecorder(dest.stream, mime ? { mimeType: mime } : undefined);
        const chunks = [];
        recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        recorder.onstop = async () => {
          try {
            const pcm = await decodeViaWebAudio(new Blob(chunks, { type: recorder.mimeType }));
            finish(() => resolve(pcm));
          } catch {
            fail('audio-capture-failed');
          }
        };

        el.onended = () => { try { recorder.stop(); } catch { /* already stopped */ } };
        recorder.start();
        await el.play();
      } catch {
        fail('audio-capture-failed');
      }
    };
  });
}

async function blobToMono16k(blob, onStatus) {
  try {
    return await decodeViaWebAudio(blob);
  } catch {
    // Container not directly decodable (e.g. .mov) — transcode in real time.
    onStatus?.('transcoding');
    return await decodeViaMediaElement(blob);
  }
}

// Transcribe a recorded/uploaded blob → { transcript, words:[{word,start,end}] }.
export async function transcribeLocally(blob, { onProgress, onStatus } = {}) {
  const transcriber = await getTranscriber(onProgress);
  const audio = await blobToMono16k(blob, onStatus);
  if (!audio.length) throw new Error('no-audio');
  const audioDuration = audio.length / 16000; // true clip length, for accurate pacing

  onStatus?.('transcribing');
  const output = await transcriber(audio, {
    return_timestamps: 'word',
    chunk_length_s: 30,
    stride_length_s: 5,
  });

  const chunks = output?.chunks ?? [];
  const words = chunks
    .map((c) => {
      const raw = (c.text || '').trim();
      // Skip Whisper's non-speech annotations: "[BLANK_AUDIO]", "(silence)", "♪", etc.
      if (!raw || /[[\]()♪#*]/.test(raw)) return null;
      const word = raw.toLowerCase().replace(/[^a-z']/g, '');
      if (!word) return null;
      const start = c.timestamp?.[0] ?? 0;
      const end = c.timestamp?.[1] ?? start + 0.3;
      return { word, start, end };
    })
    .filter(Boolean);

  const transcript = words.map((w) => w.word).join(' ');
  return { transcript, words, audioDuration };
}
