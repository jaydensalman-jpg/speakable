export default function AIFeedbackTab({ results }) {
  const { feedback } = results;

  const categories = [
    { key: 'clarity', label: 'Clarity' },
    { key: 'structure', label: 'Structure' },
    { key: 'vocabulary', label: 'Vocabulary' },
    { key: 'confidence', label: 'Confidence' },
  ];

  const getScoreBadge = (score) => {
    if (score >= 8) return 'bg-emerald-100 text-emerald-700';
    if (score >= 6) return 'bg-brand-100 text-brand-700';
    if (score >= 4) return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-600';
  };

  return (
    <div className="space-y-5">
      {feedback.tips?.length > 0 && (
        <div className="card bg-gradient-to-br from-brand-50 to-sand border-brand-100">
          <h3 className="font-semibold text-ink/80 mb-4">3 ways to improve</h3>
          <ol className="space-y-4">
            {feedback.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <span className="text-sm text-ink/70 leading-relaxed">{tip}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="space-y-3">
        {categories.map(({ key, label }) => {
          const score = feedback.categoryScores?.[key];
          const text = feedback.feedback?.[key];
          if (!text) return null;
          return (
            <div key={key} className="card">
              <div className="flex items-center gap-2 mb-2.5">
                <h4 className="font-semibold text-ink/80">{label}</h4>
                {score != null && (
                  <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full ${getScoreBadge(score)}`}>
                    {score}/10
                  </span>
                )}
              </div>
              <p className="text-sm text-ink/65 leading-relaxed">{text}</p>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-ink/40 text-center pt-2">
        Generated on your device from your speech · private, free, no account needed
      </p>
    </div>
  );
}
