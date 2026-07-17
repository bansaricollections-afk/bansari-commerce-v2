import { createClient } from '@/lib/supabase/client';

// Each function creates a fresh browser client instance.
// Do NOT instantiate at module level — that causes hydration mismatches
// when the module is evaluated during SSR.

export async function signInAdmin(email: string, password: string) {
  const supabase = createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOutAdmin() {
  const supabase = createClient();

  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
