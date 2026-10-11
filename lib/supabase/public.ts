import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";
import { getSupabaseEnv } from "./env";

/** Signed-out Data API client. Catalog reads and anon inserts do not use a session. */
export function createPublicClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createClient<Database>(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
}
