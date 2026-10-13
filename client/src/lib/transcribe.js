// In-browser speech-to-text with OpenAI Whisper, via transformers.js.
// Runs entirely on the user's device — free, private, no API key — and transcribes
// the recorded/uploaded audio faithfully (including filler words the browser's live
// dictation engine drops). Model is downloaded once and cached by the browser.
//
// transformers.js (~MBs of WASM/ONNX runtime) is dynamically imported only when a
// recording is processed, so it never weighs down the initial page load.

// Model size is the main lever on filler capture. Whisper is trained to emit
// clean, readable text and normalizes disfluencies away, and the smaller the
// variant the more aggressively it does that — tiny.en drops the most "um"/"uh",
// small.en keeps the most. Model size alone is not enough, though: even
// small.en drops clear "um"s when fluent text is more probable (measured: 0 of
// 4 kept in a sentence that also had real "I'm"s), so the decoder is also
// nudged toward hesitation tokens. See installFillerBias below.
//
// Desktop runs small.en (~238 MB quantized: 88 MB encoder + 150 MB decoder) for
// the best hesitation capture, accepting a bigger one-time download and roughly
// 1.5–2x slower inference. Phones/tablets stay on tiny.en (~40 MB): base.en was
// already too heavy there (slow WASM inference, iOS Safari memory kills), and
// small.en would be far worse.
// (iPadOS reports itself as "Mac" — the maxTouchPoints check catches it.)
const IS_MOBILE =
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (navigator.maxTouchPoints > 1 && /Mac/.test(navigator.platform));
const MODEL_ID = IS_MOBILE ? 'Xenova/whisper-tiny.en' : 'Xenova/whisper-small.en';

// Real non-speech annotations, to be dropped. Deliberately does NOT include
// um/uh/mm/er and friends: those are the fillers this whole app exists to count,
// and Whisper sometimes emits them wrapped in brackets.
const NON_SPEECH =
  /^(blank ?audio|silence|silent|music|laugh(s|ter|ing)?|sigh(s|ing)?|cough(s|ing)?|sneez(e|es|ing)|applause|cheering|noise|static|inaudible|unintelligible|crosstalk|background|breath(s|ing|es)?|clears? throat|throat clear(ing)?|beep|click|pause)$/;

let transcriberPromise = null;

// Hesitation tokens the decoder is nudged toward (see installFillerBias).
const FILLER_FORMS = [' um', ' Um', ' uh', ' Uh', ' umm', ' Umm', ' uhm', ' Uhm', ' uhh', ' Uhh'];
// Size of the nudge, in logits. Tuned Oct 2026 on synthesized clips with known
// content, on BOTH models (small.en and tiny.en):
//   - a clip with four clear fillers among real "I'm"s: 0 of 4 kept at 0 and
//     at 2, 3 of 4 at 3.5-4, 4 of 4 from 4.5 up
//   - clean speech, speech full of real "I'm"/"I am"/"umbrella"/"umpire", and
//     speech with long pauses, room noise and breath sounds: 0 fillers invented
//     at 4.5, at 6 and at 7.5
//   - at 10 it breaks down completely (clean speech becomes "uh uh uh ...")
// So 4.5 is the lowest value that recovers everything, with the tested-safe
// range extending 3 logits above it. Do not raise it without re-running both
// halves of that test; see CLAUDE.md for how the clips are made.
const FILLER_BIAS = 4.5;

// Whisper was trained on cleaned-up transcripts, so its decoder carries a
// strong prior AGAINST writing hesitations: where the audio says "um", fluent
// text is simply more probable to it, so it skips the sound or writes the
// nearest fluent word ("I'm", or folds "and, um," into a name). That prior, not
// the audio, is what loses fillers.
//
// This adds a small constant to the logits of the hesitation tokens at every
// decoding step, which cancels part of that prior and nothing else. The audio
// still decides: the bonus only changes the outcome where "um" was already a
// close runner-up, i.e. where the sound is there. It cannot create a filler
// from clean speech, where those tokens sit far below the winner.
function installFillerBias(transcriber) {
  const { model, tokenizer } = transcriber;
  const ids = new Set();
  for (const form of FILLER_FORMS) {
    const enc = tokenizer.encode(form, null, { add_special_tokens: false });
    // Whole-token forms ONLY. A spelling the tokenizer splits (" uhm" is
    // " u" + "hm") must not contribute its first piece: " u" and " U" start
    // thousands of ordinary words, and nudging them would corrupt those.
    if (enc.length === 1) ids.add(enc[0]);
  }
  const build = model._get_logits_processor.bind(model);
  model._get_logits_processor = (...args) => {
    const list = build(...args);
    // Runs after Whisper's own processors, so a step they have forced (a
    // timestamp, say) stays forced: -Infinity plus a bonus is still -Infinity.
    list.push((inputIds, logits) => {
      if (!FILLER_BIAS) return;
      // Never help a run along. Once two hesitations sit back to back the
      // bonus switches off, so the decoder cannot be coaxed into a loop of
      // them; a real sustained "ummm" still gets written on its own merits.
      const n = inputIds.length;
      if (n >= 2 && ids.has(inputIds[n - 1]) && ids.has(inputIds[n - 2])) return;
      for (const id of ids) logits.data[id] += FILLER_BIAS;
    });
    return list;
  };
  return [...ids];
}

// Lazily load the library + ASR pipeline (cached). onProgress gets download events.
function getTranscriber(onProgress) {
  if (!transcriberPromise) {
    transcriberPromise = import('@xenova/transformers')
      .then(async ({ pipeline, env }) => {
        env.allowLocalModels = false; // fetch model from the HF hub, cache in-browser
        const transcriber = await pipeline('automatic-speech-recognition', MODEL_ID, { progress_callback: onProgress });
        try {
          installFillerBias(transcriber);
        } catch (err) {
          // The hook reaches into library internals. If a future version moves
          // them, transcription must still work, just without the correction.
          console.warn('Filler bias not installed:', err);
        }
        return transcriber;
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
  const words = [];
  const keep = (c) => {
    const word = (c.text || '').toLowerCase().replace(/[^a-z']/g, '');
    if (!word) return;
    const start = c.timestamp?.[0] ?? 0;
    const end = c.timestamp?.[1] ?? start + 0.3;
    words.push({ word, start, end });
  };
  // Whisper marks non-speech in brackets ("[BLANK_AUDIO]", "(silence)",
  // "(clears throat)"), and those are dropped. Two things it must NOT do:
  //   - drop a bracketed vocalization. Whisper also writes "(um)" / "[uh]", and
  //     discarding every bracketed token (the behaviour until Sept 2026)
  //     silently deleted real fillers. Only a bracket whose contents match
  //     NON_SPEECH goes.
  //   - drop a plain spoken word that happens to be on that list. Until Oct
  //     2026 the list was applied to every word, so saying "a calm pause" lost
  //     "pause", and "silence", "music", "noise", "breathing" went the same
  //     way. A word is only an annotation if it arrived inside brackets.
  // A bracket can span several word chunks ("(clears" + "throat)"), so chunks
  // are grouped from the opening bracket to the closing one and judged together.
  let group = null;
  const flush = () => {
    const annotation = group
      .map((c) => c.text || '')
      .join(' ')
      .toLowerCase()
      .replace(/[^a-z ]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (!NON_SPEECH.test(annotation)) group.forEach(keep);
    group = null;
  };
  for (const c of chunks) {
    const raw = (c.text || '').trim();
    if (!raw || /[♪#*]/.test(raw)) continue; // music / formatting marks
    const opens = /^[[(<{]/.test(raw);
    const closes = /[\])>}][.,!?]*$/.test(raw);
    if (group || opens) {
      (group ||= []).push(c);
      // Real annotations are one to three words. A bracket still open after
      // four chunks is a stray character, not an annotation, so stop grouping
      // rather than let it swallow the sentence.
      if (closes || group.length >= 4) flush();
      continue;
    }
    keep(c);
  }
  if (group) flush(); // never closed: treat as ordinary words

  const transcript = words.map((w) => w.word).join(' ');

  // On-device diagnostic. Whisper's raw output is the only way to tell whether a
  // missing filler was never transcribed or was dropped downstream. Stays in
  // memory on this device, same as the transcript already shown in the UI, and
  // is never logged or sent anywhere. Read it with:
  //   window.__speakableDebug
  try {
    window.__speakableDebug = {
      model: MODEL_ID,
      fillerBias: FILLER_BIAS,
      rawChunks: chunks.map((c) => ({ text: c.text, at: c.timestamp?.[0] })),
      keptWords: words.length,
      droppedChunks: chunks.length - words.length,
    };
  } catch {
    /* diagnostics are never allowed to break transcription */
  }
  return { transcript, words, audioDuration };
}
