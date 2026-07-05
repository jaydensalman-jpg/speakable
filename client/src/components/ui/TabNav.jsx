export default function TabNav({ tabs, active, onChange }) {
  return (
    <div className="flex gap-0.5 bg-sand p-1 rounded-full overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 px-3 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all duration-150 ${
            active === tab.id
              ? 'bg-white text-ink shadow-soft'
              : 'text-ink/50 hover:text-ink/80'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
