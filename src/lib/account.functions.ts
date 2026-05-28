import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Forbidden: admin only");
}

const USERNAME_RE = /^[a-zA-Z0-9_.-]{3,30}$/;

export const updateUsername = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ username: z.string().regex(USERNAME_RE, "3–30 chars; letters, numbers, . _ -") }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: prof, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("username,username_edits_used")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!prof) throw new Error("Profile not found");

    const newName = data.username.trim();
    if (newName === (prof.username || "").trim()) return { ok: true, unchanged: true };
    if ((prof.username_edits_used ?? 0) >= 1) {
      throw new Error("You've already used your one username change. Contact support to request another.");
    }

    // Check uniqueness (case-insensitive)
    const { data: clash } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .ilike("username", newName)
      .neq("user_id", context.userId)
      .maybeSingle();
    if (clash) throw new Error("That username is already taken");

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ username: newName, username_edits_used: (prof.username_edits_used ?? 0) + 1 })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminResetUsernameEdit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ username_edits_used: 0 })
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminSetUsername = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({ userId: z.string().uuid(), username: z.string().regex(USERNAME_RE) }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: clash } = await supabaseAdmin
      .from("profiles")
      .select("user_id")
      .ilike("username", data.username)
      .neq("user_id", data.userId)
      .maybeSingle();
    if (clash) throw new Error("Username already taken");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ username: data.username })
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
