/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Palette lifted verbatim from the Figma redesign's index.css custom
        // properties (Oct 2026). 500 IS --color-accent and 100 IS
        // --color-accent-soft; the rest of the ramp is interpolated around them.
        brand: {
          50: '#faf0ec',
          100: '#f3dfd7', // --color-accent-soft
          200: '#e8c3b5',
          300: '#dca491',
          400: '#d4826a',
          500: '#c86242', // --color-accent
          600: '#ad5236',
          700: '#8c422b',
        },
        cream: '#f5f2ec',   // --color-canvas
        surface: '#fbfaf7', // --color-surface (the .panel fill)
        sand: '#dcd6cb',    // --color-line
        ink: '#1f1e1b',     // --color-ink
        muted: '#74716b',   // --color-muted
        faint: '#aaa59c',   // --color-faint
        // Semantic pair. Replaces Tailwind's emerald/amber so on-target and
        // off-target match the design instead of approximating it.
        good: '#287557',
        'good-soft': '#deeee7',
        warn: '#99651f',
        'warn-soft': '#f3e7cc',
      },
      fontFamily: {
        // Editorial serif for big friendly headings; clean sans for body.
        // DM Serif Display, to match the Figma redesign exactly (Oct 2026).
        // Single weight (400) by design — it has no bold, so never set font-bold
        // on display type; size and the high stroke contrast carry the emphasis.
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(43, 38, 34, 0.04), 0 8px 24px -12px rgba(43, 38, 34, 0.12)',
      },
      // Motion tokens — one organic curve + two durations, reused everywhere.
      transitionTimingFunction: {
        organic: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      transitionDuration: {
        250: '250ms',
        400: '400ms',
      },
    },
  },
  plugins: [],
};
