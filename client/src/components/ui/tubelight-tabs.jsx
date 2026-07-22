import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/cn.js';

// Tubelight tab bar — adapted from 21st.dev "tubelight-navbar". A pill switcher
// with a glowing "lamp" that springs from tab to tab via framer-motion's shared
// layout animation. Rehomed for Speakable: JSX (not TSX), warm coral/cream
// tokens (not shadcn's), buttons instead of Next.js <Link>, and CONTROLLED
// (active/onChange) so it drives the results tabs inline rather than as a fixed
// floating bar. Labels show on desktop, icons on mobile. framer-motion animates
// from JS, so it checks prefers-reduced-motion itself.
export default function TubelightTabs({ items, active, onChange }) {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex justify-center">
      <div className="flex items-center gap-1 overflow-x-auto rounded-full border border-sand bg-white/70 px-1.5 py-1.5 shadow-soft backdrop-blur">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onChange(item.id)}
              aria-label={item.label}
              className={cn(
                'relative cursor-pointer whitespace-nowrap rounded-full px-3.5 sm:px-4 py-2 text-sm font-medium transition-colors',
                isActive ? 'text-brand-700' : 'text-ink/55 hover:text-ink/80'
              )}
            >
              <span className="hidden md:inline">{item.label}</span>
              <span className="flex items-center justify-center md:hidden">
                {Icon && <Icon size={18} strokeWidth={2.2} />}
              </span>

              {isActive && (
                <motion.div
                  layoutId="tubelight"
                  className="absolute inset-0 -z-10 rounded-full bg-brand-50"
                  initial={false}
                  transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 30 }}
                >
                  {/* The lamp: a bright bar on top with a soft glow beneath it */}
                  <div className="absolute -top-1.5 left-1/2 h-1 w-8 -translate-x-1/2 rounded-t-full bg-brand-500">
                    <div className="absolute -left-2 -top-2 h-6 w-12 rounded-full bg-brand-400/25 blur-md" />
                    <div className="absolute -top-1 h-6 w-8 rounded-full bg-brand-400/25 blur-md" />
                    <div className="absolute left-2 top-0 h-4 w-4 rounded-full bg-brand-400/25 blur-sm" />
                  </div>
                </motion.div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
