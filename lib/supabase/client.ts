import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

export function createSupabaseBrowserClient() {
  // Uses Supabase Auth Helpers to keep the session in secure cookies.
  return createClientComponentClient();
}
