import { useCallback, useEffect, useState } from 'react';

// Light / dark theme.
//
// The theme is one attribute, <html data-theme="dark">, that swaps the CSS
// variables every colour resolves to (index.css). index.html sets it before
// first paint from the saved choice, so a dark-mode visitor never sees a flash
// of the light page; this module only reads and changes it afterwards.
//
// Default is light, the look the app was designed in. The choice is the
// visitor's own and is remembered on this device; it is not synced.
const KEY = 'speakable-theme';
const CANVAS = { light: '#f5f2ec', dark: '#07080b' };

export function getTheme() {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function setTheme(theme, { animate = true } = {}) {
  const root = document.documentElement;
  if (animate) {
    // One beat of cross-fade (index.css .theme-switching), then get out of the
    // way so normal hover transitions are not slowed down.
    root.classList.add('theme-switching');
    window.setTimeout(() => root.classList.remove('theme-switching'), 400);
  }
  if (theme === 'dark') root.dataset.theme = 'dark';
  else delete root.dataset.theme;

  // Browser chrome / phone status bar follows the canvas.
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', CANVAS[theme]);

  try {
    localStorage.setItem(KEY, theme);
  } catch {
    // Private mode or blocked storage: the switch still works for this visit.
  }
  window.dispatchEvent(new CustomEvent('speakable:theme', { detail: theme }));
}

export function useTheme() {
  const [theme, set] = useState(getTheme);

  useEffect(() => {
    const onChange = () => set(getTheme());
    // Another tab threw the switch: follow it.
    const onStorage = (e) => {
      if (e.key !== KEY || !e.newValue) return;
      setTheme(e.newValue === 'dark' ? 'dark' : 'light', { animate: false });
    };
    window.addEventListener('speakable:theme', onChange);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('speakable:theme', onChange);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const toggle = useCallback(() => setTheme(getTheme() === 'dark' ? 'light' : 'dark'), []);
  return { theme, isDark: theme === 'dark', toggle };
}

// A theme colour as a canvas/SVG-ready string, e.g. themeColor('brand-500', 0.9).
// For the few places that paint outside CSS (the live audio visualizer).
export function themeColor(name, alpha = 1) {
  const rgb = getComputedStyle(document.documentElement).getPropertyValue(`--c-${name}`).trim();
  return `rgb(${rgb} / ${alpha})`;
}
