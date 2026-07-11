import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase.js';

// Supabase auth session as React state. `configured` is false when the env
// keys are absent — callers render the app exactly as the pre-accounts build.
// Magic-link only (signInWithOtp): no passwords anywhere.
export function useAuth() {
  const configured = !!supabase;
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = useCallback(async (email) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return { configured, user, signIn, signOut };
}
