import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = 'https://dndbfkhrndrcwoknivxt.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRuZGJma2hybmRyY3dva25pdnh0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2MzMzOTcsImV4cCI6MjA2MjIwOTM5N30._aAr0hPK9x4lJ4dx8E49VmvECgq_3cI26ErS_wxYgFo';

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}
