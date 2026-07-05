/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Single warm accent — coral. Replaces the old indigo "brand".
        brand: {
          50: '#fdf4f1',
          100: '#fbe6df',
          200: '#f6cabb',
          300: '#efa890',
          400: '#e88a6c',
          500: '#e0714f',
          600: '#cb5a39',
          700: '#a8472d',
        },
        // Warm neutrals for the calm, paper-like surface.
        cream: '#faf8f3',
        sand: '#f1ece2',
        ink: '#2b2622',
      },
      fontFamily: {
        // Editorial serif for big friendly headings; clean sans for body.
        display: ['Fraunces', 'Georgia', 'serif'],
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
