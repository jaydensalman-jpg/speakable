import { useState } from 'react';
import { Play, LayoutGrid, MessageCircle, Scissors, BookOpen, Gauge, Sparkles } from 'lucide-react';
import TubelightTabs from '../ui/tubelight-tabs.jsx';
import SelfReviewTab from './tabs/SelfReviewTab.jsx';
import OverviewTab from './tabs/OverviewTab.jsx';
import FillerWordsTab from './tabs/FillerWordsTab.jsx';
import WordsToCutTab from './tabs/WordsToCutTab.jsx';
import VocabularyTab from './tabs/VocabularyTab.jsx';
import PacingTab from './tabs/PacingTab.jsx';
import AIFeedbackTab from './tabs/AIFeedbackTab.jsx';
import ShareButton from './ShareButton.jsx';

// Icons show on mobile (labels on desktop) in the tubelight tab bar.
const TABS = [
  { id: 'review', label: 'Watch & Listen', icon: Play },
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'fillers', label: 'Filler Words', icon: MessageCircle },
  { id: 'weak', label: 'Words to Cut', icon: Scissors },
  { id: 'vocabulary', label: 'Vocabulary', icon: BookOpen },
  { id: 'pacing', label: 'Pacing', icon: Gauge },
  { id: 'ai', label: 'Coaching', icon: Sparkles },
];

export default function Dashboard({ results }) {
  const [activeTab, setActiveTab] = useState('review');

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-ink tracking-tight">Results</h2>
          <p className="text-sm text-ink/45 mt-0.5">
            {results.words.length} words · {formatDuration(results.duration)} · {results.avgWpm} WPM avg
          </p>
        </div>
        <div className="flex items-center gap-3 pb-0.5">
          <ShareButton results={results} />
          <div className="flex items-center gap-1.5 text-xs text-ink/45">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            Complete
          </div>
        </div>
      </div>

      <TubelightTabs items={TABS} active={activeTab} onChange={setActiveTab} />

      <div>
        {activeTab === 'review' && <SelfReviewTab results={results} />}
        {activeTab === 'overview' && <OverviewTab results={results} />}
        {activeTab === 'fillers' && <FillerWordsTab results={results} />}
        {activeTab === 'weak' && <WordsToCutTab results={results} />}
        {activeTab === 'vocabulary' && <VocabularyTab results={results} />}
        {activeTab === 'pacing' && <PacingTab results={results} />}
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
