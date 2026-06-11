import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = 'https://dndbfkhrndrcwoknivxt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuZGJma2hybmRyY3dva25pdnh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEwMDYyNzMsImV4cCI6MjA5NjU4MjI3M30.Tl0EX9VJYGfvJPcL_QnYRZAbeaGC6myyhnbaSb1ckXw';

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return cookieStore.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
      },
    },
  });
}
