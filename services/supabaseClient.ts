import { createClient } from '@supabase/supabase-js';

declare global {
    interface ImportMetaEnv {
        PROD: any;
        readonly VITE_SUPABASE_URL: string;
        readonly VITE_SUPABASE_ANON_KEY: string;
    }

    interface ImportMeta {
        readonly env: ImportMetaEnv;
    }
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase configuration:', {
    url: supabaseUrl ? '✓' : '✗ VITE_SUPABASE_URL',
    key: supabaseAnonKey ? '✓' : '✗ VITE_SUPABASE_ANON_KEY'
  });
  throw new Error('Supabase environment variables are not configured. Check your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);