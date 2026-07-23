import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/cn.js';

// Results tab bar — a clean full-width segmented control. A single white pill
// springs from tab to tab via framer-motion's shared-layout animation (no blur,
// no glow — crisp and consistent with the app's other toggles). Full width so it
// lines up with the result cards below. Labels on desktop, icons on mobile.
// Controlled (active/onChange). framer-motion animates from JS, so it checks
// prefers-reduced-motion itself.
export default function TubelightTabs({ items, active, onChange }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex w-full gap-1 rounded-full bg-sand p-1">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            aria-label={item.label}
            className={cn(
              'relative flex-1 rounded-full py-2 text-sm font-medium transition-colors duration-200',
              isActive ? 'text-ink' : 'text-ink/50 hover:text-ink/75'
            )}
          >
            {isActive && (
              <motion.span
                layoutId="tab-pill"
                className="absolute inset-0 -z-10 rounded-full bg-white shadow-soft"
                initial={false}
                transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 34 }}
              />
            )}
            <span className="flex items-center justify-center">
              <span className="hidden md:inline">{item.label}</span>
              <span className="md:hidden">{Icon && <Icon size={18} strokeWidth={2.2} />}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
