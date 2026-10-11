// Serve client/dist the way Vercel does: with the headers and rewrites from
// vercel.json. `vite preview` and a plain static server apply neither, so they
// can't show what the Content-Security-Policy would block or whether /privacy
// resolves.
//
//   cd client && npm run build
//   node scripts/serve-prod.mjs        → http://127.0.0.1:4789
//
// Then use the app with DevTools open: every "[Report Only]" line in the
// console is something the policy would have blocked if it were enforced.
//
//   node scripts/serve-prod.mjs --enforce   → http://127.0.0.1:4790
//
// serves the same policy as a blocking Content-Security-Policy, which is the
// rehearsal for switching the header name in vercel.json.
// No dependencies. Not used in production.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'client', 'dist');
const config = JSON.parse(await readFile(join(root, 'vercel.json'), 'utf8'));
const enforce = process.argv.includes('--enforce');
const port = Number(process.env.PORT) || (enforce ? 4790 : 4789);
const REPORT_ONLY = 'Content-Security-Policy-Report-Only';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.wasm': 'application/wasm',
};

// vercel.json sources here are simple enough to read as anchored regexes.
const matches = (source, path) => new RegExp(`^${source}$`).test(path);

// The policy allows the inline theme script in index.html by its hash. Edit
// that script and the hash in vercel.json has to be regenerated — say so here
// rather than letting it surface as a console violation.
const html = await readFile(join(dist, 'index.html'), 'utf8');
const csp = config.headers
  .flatMap((rule) => rule.headers)
  .find((h) => h.key.toLowerCase().startsWith('content-security-policy'));
for (const [, body] of html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)) {
  const hash = `sha256-${createHash('sha256').update(body).digest('base64')}`;
  if (csp && !csp.value.includes(hash)) {
    console.warn(`CSP is missing the inline script's hash. Put '${hash}' in script-src (vercel.json).`);
  }
}

createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  for (const rule of config.headers || []) {
    if (!matches(rule.source, path)) continue;
    for (const h of rule.headers) {
      res.setHeader(enforce && h.key === REPORT_ONLY ? 'Content-Security-Policy' : h.key, h.value);
    }
  }

  const rewrite = (config.rewrites || []).find((r) => matches(r.source, path));
  const target = rewrite ? rewrite.destination : path === '/' ? '/index.html' : path;
  const file = normalize(join(dist, target));
  if (!file.startsWith(dist)) {
    res.writeHead(403).end();
    return;
  }

  try {
    const body = await readFile(file);
    res.setHeader('Content-Type', TYPES[extname(file)] || 'application/octet-stream');
    res.writeHead(200).end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('404');
  }
}).listen(port, '127.0.0.1', () => {
  const mode = enforce ? 'CSP ENFORCED' : 'CSP report-only';
  console.log(`Speakable production build with vercel.json headers (${mode}): http://127.0.0.1:${port}`);
});
