// Header actions from the Figma results redesign: Record is the primary pill,
// while History stays quieter. On phones, History keeps its accessible name
// while the visible label gives way to the calendar icon.
export default function SegmentedNav({ items, active, onChange }) {
  return (
    <nav aria-label="Main navigation" className="flex items-center gap-1 sm:gap-2">
      {items.map((it) => {
        const isActive = active === it.id;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            aria-current={isActive ? 'page' : undefined}
            className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full px-2.5 text-[0.8125rem] font-medium transition-colors duration-200 sm:px-3 ${
              isActive
                ? 'border border-sand bg-surface text-ink shadow-soft'
                : 'border border-transparent text-muted hover:text-ink'
            }`}
          >
            <span className="flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden="true">
              {it.icon}
            </span>
            <span className={it.id === 'history' ? 'sr-only sm:not-sr-only' : undefined}>
              {it.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
