// Tiny synthesized UI sounds for the idea shuffle. Everything is generated with
// the Web Audio API at play time — no audio files, no new dependencies, nothing
// added to the bundle or the bandwidth bill.
//
// Two constraints shaped this:
//   1. The AudioContext is created lazily on the first real gesture. Browsers
//      block audio started outside a user interaction, and building it eagerly
//      would leave a suspended context sitting open on every page load.
//   2. stopAll() exists because the reel is ~1s long and the IdeaGenerator
//      unmounts the moment recording starts. Scheduled Web Audio keeps playing
//      after React tears the component down, so an un-cancelled landing chime
//      could bleed into the microphone and land in the transcript.

const MUTE_KEY = 'speakable-sfx-muted';

let ctx = null;
const active = new Set();

function getCtx() {
  if (ctx) {
    // Autoplay policy can suspend the context between interactions.
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null; // no Web Audio: animation still runs, just silent
  try {
    ctx = new Ctor();
    return ctx;
  } catch {
    return null;
  }
}

export function isMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false; // private mode / storage blocked
  }
}

export function setMuted(muted) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    /* preference just won't persist */
  }
  if (muted) stopAll();
}

// One sine blip with a soft attack and exponential decay. Sine (not square or
// saw) keeps it warm rather than arcade-harsh. Gains ramp to 0.0001 instead of
// 0 because exponentialRampToValueAtTime cannot target zero.
function blip({ freq, at, dur, peak }) {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(at);
  osc.stop(at + dur + 0.02);
  active.add(osc);
  osc.onended = () => active.delete(osc);
}

// A soft click for each item the reel passes through. Pitch rises slightly as
// the reel slows so the roll reads as "winding down" rather than flat repetition.
export function tick(progress = 0) {
  if (isMuted()) return;
  const c = getCtx();
  if (!c) return;
  blip({
    freq: 900 + progress * 600,
    at: c.currentTime,
    dur: 0.035,
    peak: 0.045,
  });
}

// The landing chime: an A major triad rolled like a harp. Staggering the notes
// by 45ms each reads as arrival rather than a single flat beep.
export function land() {
  if (isMuted()) return;
  const c = getCtx();
  if (!c) return;
  const now = c.currentTime;
  const triad = [
    { freq: 880.0, delay: 0.0, peak: 0.075 },   // A5
    { freq: 1108.73, delay: 0.045, peak: 0.065 }, // C#6
    { freq: 1318.51, delay: 0.09, peak: 0.055 },  // E6
  ];
  for (const n of triad) {
    blip({ freq: n.freq, at: now + n.delay, dur: 0.55, peak: n.peak });
  }
  // Quiet root an octave down for warmth underneath the triad.
  blip({ freq: 440.0, at: now, dur: 0.4, peak: 0.03 });
}

// Silence anything still scheduled. Called on unmount and when muting.
export function stopAll() {
  for (const osc of active) {
    try {
      osc.stop();
    } catch {
      /* already stopped */
    }
  }
  active.clear();
}
