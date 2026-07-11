// Minimal class-name joiner (the useful core of shadcn's `cn` — we don't need
// tailwind-merge because callers here never pass conflicting utilities).
export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}
