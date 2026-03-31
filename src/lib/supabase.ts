import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Add these variables to your .env.local file
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// We set this up so it doesn't crash during build if env vars aren't present
export const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

if (typeof window !== 'undefined') {
  if (supabase) {
    console.log("✅ Supabase Client Initialized with URL:", supabaseUrl);
  } else {
    console.warn("⚠️ Supabase Client NOT Initialized. Missing .env.local variables.");
  }
}
