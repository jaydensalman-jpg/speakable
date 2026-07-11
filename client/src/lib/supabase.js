import { createClient } from '@supabase/supabase-js';

// Cloud accounts are OPTIONAL. Without VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
// (client/.env.local, see client/.env.example) `supabase` is null and the whole
// app runs exactly as before — local-only, no network. Every cloud call site
// must tolerate the null.
const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = url && anonKey ? createClient(url, anonKey) : null;
