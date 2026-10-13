import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://YOUR_PROJECT_REF.supabase.co';
export const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_PUBLISHABLE_OR_ANON_KEY';
export const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:4000';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
    },
});
