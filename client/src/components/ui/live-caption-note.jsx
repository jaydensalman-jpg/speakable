// Shown when a report was built from the browser's live captions because the
// on-device model could not run. Live captions strip most filler words and
// often write "um" as "I'm", so a low filler count from them is not a
// measurement. Saying so is the difference between a known limit and a wrong
// number presented as fact. Renders nothing for a normal report.
export default function LiveCaptionNote({ results, className = '' }) {
  if (results?.transcriptSource !== 'live') return null;
  return (
    <p className={`rounded-xl border border-warn/40 bg-warn-soft px-4 py-3 text-[0.875rem] leading-relaxed text-ink/80 ${className}`}>
      <span className="font-semibold text-warn">Filler count may be low.</span> The on-device
      transcriber could not run for this take, so the words come from your browser&rsquo;s live
      captions, which leave out most filler words. Record again for an accurate count.
    </p>
  );
}
