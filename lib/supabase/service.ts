import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/types";

/** Service role client. Bypasses RLS and the listing/profile guards. Server only. */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;

  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
