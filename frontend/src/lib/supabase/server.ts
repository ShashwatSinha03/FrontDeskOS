import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const supabaseUrl = 'https://dndbfkhrndrcwoknivxt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuZGJma2hybmRyY3dva25pdnh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2MzMzOTcsImV4cCI6MjA2MjIwOTM5N30._aAr0hPK9x4lJ4dx8E49VmvECgq_3cI26ErS_wxYgFo';

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
