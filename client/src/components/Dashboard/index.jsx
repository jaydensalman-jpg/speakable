import { useState } from 'react';
import TabNav from '../ui/TabNav.jsx';
import SelfReviewTab from './tabs/SelfReviewTab.jsx';
import OverviewTab from './tabs/OverviewTab.jsx';
import FillerWordsTab from './tabs/FillerWordsTab.jsx';
import PacingTab from './tabs/PacingTab.jsx';
import AIFeedbackTab from './tabs/AIFeedbackTab.jsx';
import ShareButton from './ShareButton.jsx';

const TABS = [
  { id: 'review', label: 'Watch & Listen' },
  { id: 'overview', label: 'Overview' },
  { id: 'fillers', label: 'Filler Words' },
  { id: 'pacing', label: 'Pacing' },
  { id: 'ai', label: 'Coaching' },
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

      <TabNav tabs={TABS} active={activeTab} onChange={setActiveTab} />

      <div>
        {activeTab === 'review' && <SelfReviewTab results={results} />}
        {activeTab === 'overview' && <OverviewTab results={results} />}
        {activeTab === 'fillers' && <FillerWordsTab results={results} />}
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
