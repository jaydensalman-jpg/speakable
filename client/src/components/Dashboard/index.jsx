import { useState } from 'react';
import { Play, LayoutGrid, MessageCircle, Scissors, BookOpen, Sparkles } from 'lucide-react';
import TubelightTabs from '../ui/tubelight-tabs.jsx';
import SelfReviewTab from './tabs/SelfReviewTab.jsx';
import OverviewTab from './tabs/OverviewTab.jsx';
import FillerWordsTab from './tabs/FillerWordsTab.jsx';
import WordsToCutTab from './tabs/WordsToCutTab.jsx';
import VocabularyTab from './tabs/VocabularyTab.jsx';
import AIFeedbackTab from './tabs/AIFeedbackTab.jsx';

// Icons show on mobile (labels on desktop) in the tubelight tab bar.
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
      <div>
        <h2 className="text-2xl font-semibold text-ink tracking-tight">Results</h2>
        {/* Figures in the display face, units quiet behind them. Pace lives on
            its own Overview card, so it does not need repeating here. */}
        <p className="mt-1 font-display text-[15px] text-ink/45 tabular-nums">
          <span className="font-semibold text-ink/75">{results.words.length}</span> words
          <span className="mx-2 text-ink/25">·</span>
          <span className="font-semibold text-ink/75">{formatDuration(results.duration)}</span>
        </p>
      </div>

      <TubelightTabs items={TABS} active={activeTab} onChange={setActiveTab} />

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
