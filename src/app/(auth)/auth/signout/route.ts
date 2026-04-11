import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Already signed out, or Supabase env missing. Either way, send the user
    // back to the home page below.
  }

  revalidatePath("/", "layout");

  return NextResponse.redirect(new URL("/", request.url), {
    // 303 converts the form POST into a GET on the destination
    status: 303,
  });
}
