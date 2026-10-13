import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in react-app/.env');
}

export const supabase = createClient(
  supabaseUrl || 'https://example.supabase.co',
  supabaseKey || 'missing-publishable-key',
  { auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true } }
);

export const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:4000').replace(/\/$/, '');
