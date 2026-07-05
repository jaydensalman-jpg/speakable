// Imported first by index.js so env vars are set BEFORE any route module builds
// its API client from process.env. Loads server/.env, then falls back to the
// repo-root .env — so the app runs wherever the key lives.
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(here, '.env') });
dotenv.config({ path: path.join(here, '..', '.env') });
