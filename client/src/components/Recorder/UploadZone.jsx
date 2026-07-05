import { useRef, useState } from 'react';

export default function UploadZone({ onFile }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(file) {
    if (!file) return;
    const ok = file.type.startsWith('audio/') || file.type.startsWith('video/');
    if (!ok) {
      alert('Please upload an audio or video file.');
      return;
    }
    onFile(file);
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFile(e.dataTransfer.files[0]);
      }}
      className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-all ${
        dragging
          ? 'border-brand-400 bg-brand-50'
          : 'border-sand hover:border-brand-300 hover:bg-cream'
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="audio/*,video/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files[0])}
      />
      <div className="flex flex-col items-center gap-3">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
          dragging ? 'bg-brand-100' : 'bg-sand'
        }`}>
          <svg
            className={`w-6 h-6 transition-colors ${dragging ? 'text-brand-500' : 'text-ink/45'}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
        </div>
        <div>
          <p className="font-medium text-ink/70">
            Drop a file or <span className="text-brand-600">browse</span>
          </p>
          <p className="text-xs text-ink/45 mt-1">MP3, MP4, WAV, WebM, MOV · up to 5 minutes</p>
        </div>
      </div>
    </div>
  );
}
