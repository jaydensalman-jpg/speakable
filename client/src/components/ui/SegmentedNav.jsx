import { useEffect, useLayoutEffect, useRef, useState } from 'react';

// Segmented control with a sliding "pill" indicator that glides to the active item
// (21st.dev "Sliding Tabs" pattern, themed). Pure CSS transition — no deps.
export default function SegmentedNav({ items, active, onChange }) {
  const btnRefs = useRef({});
  const [pill, setPill] = useState({ left: 0, width: 0, ready: false });

  const measure = () => {
    const el = btnRefs.current[active];
    if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth, ready: true });
  };

  useLayoutEffect(measure, [active, items]);
  useEffect(() => {
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  });

  return (
    <div className="relative flex items-center gap-1 rounded-full bg-sand p-1">
      <span
        aria-hidden
        className="absolute top-1 bottom-1 rounded-full bg-white shadow-soft transition-[left,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ left: pill.left, width: pill.width, opacity: pill.ready ? 1 : 0 }}
      />
      {items.map((it) => {
        const isActive = active === it.id;
        return (
          <button
            key={it.id}
            ref={(el) => (btnRefs.current[it.id] = el)}
            onClick={() => onChange(it.id)}
            className={`relative z-10 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-200 ${
              isActive ? 'text-ink' : 'text-ink/50 hover:text-ink/80'
            }`}
          >
            {it.icon}
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
