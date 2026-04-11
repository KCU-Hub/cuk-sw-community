import { cache } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

type UserAndProfile = {
  user: User | null;
  profile: Profile | null;
};

// Single round-trip: auth.getUser() + profile select. Cached per render tree
// so getCurrentUser/getCurrentProfile dedupe to one DB hit even when both are
// called in the same React tree.
const fetchUserAndProfile = cache(async (): Promise<UserAndProfile> => {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { user: null, profile: null };

    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();
    return { user, profile: (data as Profile | null) ?? null };
  } catch {
    return { user: null, profile: null };
  }
});

export async function getCurrentUser() {
  return (await fetchUserAndProfile()).user;
}

export async function getCurrentProfile() {
  return (await fetchUserAndProfile()).profile;
}
