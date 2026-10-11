import { cache } from "react";
import { sessionUser } from "@/lib/api/owner-listing";
import { initials } from "@/lib/owner-dashboard";

export type AdminStaff = {
  name: string;
  email: string;
  initials: string;
};

export const loadAdminStaff = cache(async (): Promise<AdminStaff> => {
  const { supabase, user } = await sessionUser();
  if (!user) return { name: "Admin", email: "", initials: "FK" };
  const profile = await supabase.from("profiles").select("full_name, email").eq("id", user.id).maybeSingle();
  if (profile.error) throw new Error(profile.error.message);
  const name = profile.data?.full_name?.trim() || user.email || "Admin";
  const email = profile.data?.email?.trim() || user.email || "";
  return { name, email, initials: initials(name, email) };
});
