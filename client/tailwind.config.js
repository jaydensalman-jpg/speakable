// `rgb(var(--c-x) / <alpha-value>)` keeps Tailwind's opacity modifiers working
// (text-ink/55, bg-sand/70, ...) on top of a themeable variable.
const v = (name) => `rgb(var(--c-${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Every colour is a CSS variable (an "R G B" triplet in index.css), so
        // the light/dark switch re-themes the whole app by swapping variables
        // on <html data-theme>. No `dark:` variants anywhere: a class written
        // once is correct in both themes, including its /opacity steps.
        //
        // Light values are the Figma redesign's custom properties. Dark values
        // are the palette of the 3D explainer video (speakable-3d/js/kit.js).
        brand: {
          50: v('brand-50'),
          100: v('brand-100'), // --color-accent-soft
          200: v('brand-200'),
          300: v('brand-300'),
          400: v('brand-400'),
          500: v('brand-500'), // --color-accent
          600: v('brand-600'),
          700: v('brand-700'),
          800: v('brand-800'),
        },
        cream: v('cream'),     // --color-canvas
        surface: v('surface'), // --color-surface (the .panel fill)
        card: v('card'),       // raised surface: white in light, glass-dark in dark
        sand: v('sand'),       // --color-line
        ink: v('ink'),         // --color-ink
        muted: v('muted'),     // --color-muted
        faint: v('faint'),     // --color-faint
        // Text/icon colour on a solid accent fill. White in light; in dark the
        // video sets labels on coral in a deep warm brown, which also reads
        // better on the brighter coral than white does.
        onbrand: v('onbrand'),
        // Semantic pair. Replaces Tailwind's emerald/amber so on-target and
        // off-target match the design instead of approximating it.
        good: v('good'),
        'good-soft': v('good-soft'),
        warn: v('warn'),
        'warn-soft': v('warn-soft'),
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
        soft: 'var(--shadow-soft)', // themed in index.css
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
