import { forwardRef } from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '../../lib/cn.js';

// Kokonut UI "interactive hover button", re-homed for SpeakCoach (JSX, warm
// tokens): a white pill with a coral seed dot that floods the button on hover
// while the label glides out and returns in white with an arrow. On touch
// devices there's no hover — the idle white pill + dot is the whole button.
//
// Sizing: the base sets NO padding/width — callers pass their own (px-*/py-*/
// w-full) via className. There's no tailwind-merge here (cn just joins), so
// keeping size out of the base is what prevents utility conflicts.
const InteractiveHoverButton = forwardRef(function InteractiveHoverButton(
  { text = 'Button', className, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        'group relative cursor-pointer overflow-hidden rounded-full border border-sand bg-white text-center font-semibold text-ink shadow-soft',
        'transition-colors duration-300 ease-organic hover:border-brand-500',
        'disabled:pointer-events-none disabled:opacity-40 disabled:cursor-not-allowed',
        className
      )}
      {...props}
    >
      <span className="inline-block translate-x-1 transition-all duration-300 ease-organic group-hover:translate-x-12 group-hover:opacity-0">
        {text}
      </span>
      <div
        aria-hidden
        className="absolute inset-0 z-10 flex translate-x-12 items-center justify-center gap-2 text-white opacity-0 transition-all duration-300 ease-organic group-hover:-translate-x-1 group-hover:opacity-100"
      >
        <span>{text}</span>
        <ArrowRight className="h-4 w-4" />
      </div>
      {/* Fixed left-4 (not the original left-[20%]) so the seed dot stays inside
          the padding on wide/full-width buttons instead of under the label. */}
      <div
        aria-hidden
        className="absolute left-4 top-[40%] h-2 w-2 scale-[1] rounded-lg bg-brand-500 transition-all duration-300 ease-organic group-hover:left-0 group-hover:top-0 group-hover:h-full group-hover:w-full group-hover:scale-[1.8]"
      />
    </button>
  );
});

export { InteractiveHoverButton };
