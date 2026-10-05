import { useState } from 'react';
import { Play, LayoutGrid, MessageCircle, Scissors, BookOpen, Sparkles } from 'lucide-react';
import ResultsTabs from '../ui/results-tabs.jsx';
import SelfReviewTab from './tabs/SelfReviewTab.jsx';
import OverviewTab from './tabs/OverviewTab.jsx';
import FillerWordsTab from './tabs/FillerWordsTab.jsx';
import WordsToCutTab from './tabs/WordsToCutTab.jsx';
import VocabularyTab from './tabs/VocabularyTab.jsx';
import AIFeedbackTab from './tabs/AIFeedbackTab.jsx';

// Labels show at every width; the row scrolls on phones (see results-tabs).
// `icon` is unused by the new bar but kept so the shape stays stable.
const TABS = [
  { id: 'review', label: 'Watch & Listen', icon: Play },
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'fillers', label: 'Filler Words', icon: MessageCircle },
  { id: 'weak', label: 'Words to Cut', icon: Scissors },
  { id: 'vocabulary', label: 'Vocabulary', icon: BookOpen },
  { id: 'ai', label: 'Coaching', icon: Sparkles },
];

export default function Dashboard({ results }) {
  const [activeTab, setActiveTab] = useState('review');

  return (
    <div className="space-y-6">
      {/* .page-head — title and meta share a baseline on desktop, stack on phones. */}
      <div className="flex flex-col items-baseline justify-between gap-1 md:flex-row">
        <h2 className="font-display text-[3rem] leading-[0.95] tracking-[-0.025em] text-ink md:text-[4rem]">
          Results
        </h2>
        <p className="text-[0.8125rem] text-ink/55 tabular-nums">
          {results.words.length.toLocaleString()} words &middot; {formatDuration(results.duration)}
        </p>
      </div>

      <ResultsTabs items={TABS} active={activeTab} onChange={setActiveTab} />

      <div>
        {activeTab === 'review' && <SelfReviewTab results={results} />}
        {activeTab === 'overview' && <OverviewTab results={results} />}
        {activeTab === 'fillers' && <FillerWordsTab results={results} />}
        {activeTab === 'weak' && <WordsToCutTab results={results} />}
        {activeTab === 'vocabulary' && <VocabularyTab results={results} />}
        {activeTab === 'ai' && <AIFeedbackTab results={results} />}
      </div>
    </div>
  );
}

function formatDuration(s) {
  if (!s) return '—';
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}
