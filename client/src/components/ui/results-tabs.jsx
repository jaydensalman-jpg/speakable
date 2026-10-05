// Results tab bar, built to match the Figma redesign's `.tab-list`: a plain
// horizontally scrollable row of labels on a hairline, with a 2px coral
// underline marking the active one. Replaces the tubelight pill bar on the
// Results screen (tubelight-tabs.jsx is kept but no longer used there).
//
// Labels show at every width and the row scrolls on phones, the way the design
// does, rather than collapsing to icons.
export default function ResultsTabs({ items, active, onChange }) {
  return (
    <nav aria-label="Result sections" className="-mx-4 px-4 sm:mx-0 sm:px-0">
      <div
        role="tablist"
        className="flex gap-6 overflow-x-auto border-b border-sand sm:gap-8
                   [-ms-overflow-style:none] [scrollbar-width:none]
                   [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) => {
          const isActive = item.id === active;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(item.id)}
              className={`relative shrink-0 whitespace-nowrap py-3.5 text-[0.9375rem]
                          transition-colors duration-250
                          ${isActive ? 'text-ink' : 'text-ink/55 hover:text-ink'}`}
            >
              {item.label}
              {/* Sits on the list's hairline rather than above it. */}
              <span
                aria-hidden
                className={`absolute inset-x-0 -bottom-px h-0.5 ${
                  isActive ? 'bg-brand-500' : 'bg-transparent'
                }`}
              />
            </button>
          );
        })}
      </div>
    </nav>
  );
}
