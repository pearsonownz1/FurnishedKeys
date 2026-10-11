import { connection } from "next/server";
import { SiteHeader } from "@/components/site-header";
import type { UserRole } from "@/lib/db/types";
import { createClient } from "@/lib/supabase/server";

export async function AccountHeader({ tone = "solid" }: { tone?: "overlay" | "solid" }) {
  await connection();
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  let role: UserRole | null = null;
  if (data.user) {
    const profile = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    role = profile.data?.role ?? null;
  }

  return <SiteHeader tone={tone} signedIn={Boolean(data.user)} role={role} />;
}
