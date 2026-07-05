import { useRef, useState, useCallback } from 'react';

export function useMediaRecorder() {
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState(null);

  // withVideo=true captures the webcam too, so we can play back a muted video
  // ("see how you look") alongside an audio-only review ("hear how you sound").
  const start = useCallback(async (withVideo = false) => {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: withVideo
        ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
        : false,
    });
    setStream(mediaStream);
    chunksRef.current = [];

    const recorder = new MediaRecorder(mediaStream, { mimeType: getSupportedMimeType(withVideo) });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.start(100);
    setIsRecording(true);
    return mediaStream;
  }, []);

  // Pause/resume: paused time is excluded from the recorded blob entirely.
  const pause = useCallback(() => {
    const r = mediaRecorderRef.current;
    if (r && r.state === 'recording') r.pause();
  }, []);

  const resume = useCallback(() => {
    const r = mediaRecorderRef.current;
    if (r && r.state === 'paused') r.resume();
  }, []);

  const stop = useCallback(() => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder) return resolve(null);

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        stream?.getTracks().forEach((t) => t.stop());
        setStream(null);
        setIsRecording(false);
        resolve(blob);
      };

      recorder.stop(); // works from both 'recording' and 'paused' states
    });
  }, [stream]);

  return { start, stop, pause, resume, isRecording, stream };
}

function getSupportedMimeType(withVideo) {
  const types = withVideo
    ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4']
    : ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg', 'audio/mp4'];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}
