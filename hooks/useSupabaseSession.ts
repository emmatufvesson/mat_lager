import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';

import { supabase } from '../services/supabaseClient';

interface UseSupabaseSessionResult {
  session: Session | null;
  initializing: boolean;
}

export function useSupabaseSession(): UseSupabaseSessionResult {
  const [session, setSession] = useState<Session | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const handleInitialSession = async () => {
      // Supabase magic links with PKCE return a `code` query param that must be exchanged for a session.
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');

      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (!isMounted) return;

        if (error) {
          setSession(null);
        } else {
          setSession(data.session ?? null);
          // Clean up URL so the code is not kept in history
          window.history.replaceState({}, document.title, url.pathname + url.hash);
        }
        setInitializing(false);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setSession(data.session ?? null);
      setInitializing(false);
    };

    handleInitialSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setInitializing(false);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return { session, initializing };
}
