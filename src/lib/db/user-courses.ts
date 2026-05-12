import { createClient } from "@/lib/supabase/server";
import type { UserCourse } from "@/lib/types";

export async function listUserCourses(userId: string): Promise<UserCourse[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_courses")
    .select("*")
    .eq("user_id", userId)
    .order("semester", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as UserCourse[];
}

export async function getUserCourseById(
  id: string,
): Promise<UserCourse | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_courses")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as UserCourse | null) ?? null;
}
