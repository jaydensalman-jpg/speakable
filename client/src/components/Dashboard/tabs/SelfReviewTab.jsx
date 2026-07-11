export default function SelfReviewTab({ results }) {
  const { mediaUrl, mediaType } = results;
  const hasVideo = mediaType === 'video' && mediaUrl;

  if (!mediaUrl) {
    return (
      <div className="card text-center text-ink/50 text-sm py-10">
        {results.cloudOnly
          ? 'The recording stays on the device where it was made — only this report synced to your account.'
          : 'This recording isn’t available to play back. Try recording again to use the self-review.'}
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-rise">
      <div className={`grid gap-5 ${hasVideo ? 'lg:grid-cols-2' : ''}`}>
        {hasVideo && (
          <ReviewCard
            label="Video"
            hint="No audio — watch your posture, gestures, and eye contact."
            accent="No audio"
            icon={
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
            }
          >
            <video
              src={mediaUrl}
              muted
              controls
              playsInline
              className="w-full aspect-video rounded-2xl bg-ink object-cover"
            />
          </ReviewCard>
        )}

        <ReviewCard
          label="Audio"
          hint="No video — focus on tone, pace, and pauses."
          accent="Audio only"
          icon={
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
          }
        >
          <div className="flex items-center justify-center rounded-2xl bg-cream border border-sand py-8 px-5">
            <audio src={mediaUrl} controls className="w-full" />
          </div>
        </ReviewCard>
      </div>

      {!hasVideo && (
        <p className="text-center text-xs text-ink/40">
          Audio-only recording — use Camera mode to see yourself too.
        </p>
      )}
    </div>
  );
}

function ReviewCard({ label, hint, accent, icon, children }) {
  return (
    <div className="card flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
              {icon}
            </svg>
          </div>
          <div>
            <h3 className="font-display text-lg text-ink leading-tight">{label}</h3>
            <p className="text-xs text-ink/50 mt-0.5">{hint}</p>
          </div>
        </div>
        <span className="shrink-0 text-[11px] font-medium text-brand-700 bg-brand-50 rounded-full px-2.5 py-1 ring-1 ring-brand-100">
          {accent}
        </span>
      </div>
      {children}
    </div>
  );
}
