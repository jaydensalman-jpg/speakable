import { useRef, useState, useCallback } from 'react';

// On-device eye-contact tracking with MediaPipe Face Landmarker, sampled from the
// live camera preview at ~10fps. Frames never leave the browser. The model is
// lazy-loaded on the first camera recording (like Whisper in lib/transcribe.js);
// if it can't load (offline, unsupported device), recording works exactly as before.
//
// "Eye contact" here is deliberately coarse: the head is roughly facing the camera
// AND the eyes aren't strongly averted. Head pose comes from the facial
// transformation matrix, eye direction from the eyeLook* blendshapes. Thresholds
// are independent (not summed) so a sign-convention surprise can't flip the result.

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

const SAMPLE_MS = 100; // ~10fps — plenty for gaze state, cheap enough for phones
const MAX_TICK_GAP_S = 0.35; // cap dt so tab-hidden stalls don't inflate the clock
const YAW_LIMIT_DEG = 20; // head turn still counted as "at the camera"
const PITCH_LIMIT_DEG = 16; // head tilt tolerance (laptop cameras sit below eye line)
const GAZE_LIMIT = 0.42; // eyeLook* blendshape magnitude (0..1) that counts as averted
const MIN_TRACKED_S = 3; // below this there's no meaningful stat to report

let landmarkerPromise = null;

function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = import('@mediapipe/tasks-vision')
      .then(async ({ FilesetResolver, FaceLandmarker }) => {
        const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
        const options = (delegate) => ({
          baseOptions: { modelAssetPath: MODEL_URL, delegate },
          runningMode: 'VIDEO',
          numFaces: 1,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: true,
        });
        try {
          return await FaceLandmarker.createFromOptions(vision, options('GPU'));
        } catch {
          return await FaceLandmarker.createFromOptions(vision, options('CPU'));
        }
      })
      .catch((err) => {
        landmarkerPromise = null; // allow retry on a later take
        throw err;
      });
  }
  return landmarkerPromise;
}

// Column-major 4x4 → head yaw/pitch in degrees (Tait-Bryan Z·Y·X extraction).
function headAnglesDeg(d) {
  const clamp = (v) => Math.min(1, Math.max(-1, v));
  const yaw = Math.asin(-clamp(d[2]));
  const pitch = Math.atan2(d[6], d[10]);
  return { yaw: (yaw * 180) / Math.PI, pitch: (pitch * 180) / Math.PI };
}

function isContact(result) {
  const matrix = result.facialTransformationMatrixes?.[0]?.data;
  const shapes = result.faceBlendshapes?.[0]?.categories;
  if (!matrix || !shapes) return false; // no face in frame → not eye contact

  const { yaw, pitch } = headAnglesDeg(matrix);
  if (Math.abs(yaw) > YAW_LIMIT_DEG || Math.abs(pitch) > PITCH_LIMIT_DEG) return false;

  const s = {};
  for (const c of shapes) s[c.categoryName] = c.score;
  const gazeX =
    ((s.eyeLookOutLeft ?? 0) + (s.eyeLookInRight ?? 0) - (s.eyeLookOutRight ?? 0) - (s.eyeLookInLeft ?? 0)) / 2;
  const gazeY =
    ((s.eyeLookUpLeft ?? 0) + (s.eyeLookUpRight ?? 0) - (s.eyeLookDownLeft ?? 0) - (s.eyeLookDownRight ?? 0)) / 2;
  return Math.abs(gazeX) <= GAZE_LIMIT && Math.abs(gazeY) <= GAZE_LIMIT;
}

export function useEyeContact() {
  // 'contact' | 'away' while tracking, null when unavailable/not running.
  const [live, setLive] = useState(null);

  const intervalRef = useRef(null);
  const stoppedRef = useRef(false);
  const pausedRef = useRef(false);
  const lastTickRef = useRef(0);
  const runsRef = useRef({ contact: 0, away: 0 }); // consecutive raw frames, for hysteresis
  const smoothedRef = useRef(false);
  const statsRef = useRef(null);

  const start = useCallback(async (videoEl) => {
    stoppedRef.current = false;
    pausedRef.current = false;
    smoothedRef.current = false;
    runsRef.current = { contact: 0, away: 0 };
    statsRef.current = { tracked: 0, contact: 0, streak: 0, longest: 0 };

    let landmarker;
    try {
      landmarker = await getLandmarker();
    } catch (err) {
      console.warn('Eye-contact tracking unavailable:', err);
      return; // live stays null → indicator never shows, recording unaffected
    }
    if (stoppedRef.current) return; // recording ended before the model loaded

    setLive('away');
    lastTickRef.current = performance.now();

    intervalRef.current = setInterval(() => {
      const now = performance.now();
      const dt = Math.min((now - lastTickRef.current) / 1000, MAX_TICK_GAP_S);
      lastTickRef.current = now;
      if (pausedRef.current || !videoEl || videoEl.readyState < 2) return;

      let raw = false;
      try {
        raw = isContact(landmarker.detectForVideo(videoEl, now));
      } catch {
        return; // skip a bad frame
      }

      // Hysteresis: 2 frames to gain contact, 3 to lose it — no flicker.
      const runs = runsRef.current;
      if (raw) {
        runs.contact += 1;
        runs.away = 0;
        if (runs.contact >= 2) smoothedRef.current = true;
      } else {
        runs.away += 1;
        runs.contact = 0;
        if (runs.away >= 3) smoothedRef.current = false;
      }
      setLive(smoothedRef.current ? 'contact' : 'away');

      const stats = statsRef.current;
      stats.tracked += dt;
      if (smoothedRef.current) {
        stats.contact += dt;
        stats.streak += dt;
        if (stats.streak > stats.longest) stats.longest = stats.streak;
      } else {
        stats.streak = 0;
      }
    }, SAMPLE_MS);
  }, []);

  // Freeze the clock while the take is paused (matches recorder/captions behavior).
  const setPaused = useCallback((paused) => {
    pausedRef.current = paused;
    if (!paused) lastTickRef.current = performance.now();
  }, []);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setLive(null);
    const s = statsRef.current;
    statsRef.current = null;
    if (!s || s.tracked < MIN_TRACKED_S) return null;
    return {
      trackedSeconds: Math.round(s.tracked * 10) / 10,
      contactSeconds: Math.round(s.contact * 10) / 10,
      contactPct: Math.round((s.contact / s.tracked) * 100),
      longestStreakSeconds: Math.round(s.longest * 10) / 10,
    };
  }, []);

  return { start, stop, setPaused, live };
}
