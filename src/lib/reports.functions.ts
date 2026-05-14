import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

export const submitReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      postId: z.string().uuid(),
      reason: z.enum(["spam", "inappropriate", "copyright", "misinformation", "harassment", "other"]),
      details: z.string().max(2000).optional().default(""),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await supabaseAdmin.from("content_reports").insert({
      post_id: data.postId,
      reporter_user_id: context.userId,
      reason: data.reason,
      details: data.details,
    });
    if (error) {
      if (error.code === "23505") throw new Error("You've already reported this lesson");
      throw new Error(error.message);
    }
    return { ok: true };
  });

export const adminListReports = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      status: z.enum(["pending", "reviewed", "dismissed", "removed", "all"]).optional().default("pending"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("content_reports")
      .select("id,post_id,reporter_user_id,reason,details,status,created_at,reviewed_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: reports, error } = await q;
    if (error) throw new Error(error.message);

    const postIds = [...new Set((reports ?? []).map((r: any) => r.post_id))];
    const reporterIds = [...new Set((reports ?? []).map((r: any) => r.reporter_user_id))];
    const [{ data: posts }, { data: reporters }] = await Promise.all([
      postIds.length
        ? supabaseAdmin.from("posts").select("id,title,slug,published_at,author_user_id").in("id", postIds)
        : Promise.resolve({ data: [] as any[] }),
      reporterIds.length
        ? supabaseAdmin.from("profiles").select("user_id,username,title,surname,email").in("user_id", reporterIds)
        : Promise.resolve({ data: [] as any[] }),
    ]);
    const postMap = new Map((posts ?? []).map((p: any) => [p.id, p]));
    const repMap = new Map((reporters ?? []).map((r: any) => [r.user_id, r]));
    return (reports ?? []).map((r: any) => ({
      ...r,
      post: postMap.get(r.post_id) ?? null,
      reporter: repMap.get(r.reporter_user_id) ?? null,
    }));
  });

export const adminCountPendingReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { count } = await supabaseAdmin
      .from("content_reports")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");
    return { count: count ?? 0 };
  });

export const adminResolveReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      reportId: z.string().uuid(),
      action: z.enum(["dismiss", "mark_reviewed", "unpublish_lesson", "delete_lesson"]),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: report, error: rErr } = await supabaseAdmin
      .from("content_reports").select("post_id").eq("id", data.reportId).maybeSingle();
    if (rErr) throw new Error(rErr.message);
    if (!report) throw new Error("Report not found");

    if (data.action === "dismiss" || data.action === "mark_reviewed") {
      const status = data.action === "dismiss" ? "dismissed" : "reviewed";
      await supabaseAdmin.from("content_reports")
        .update({ status, reviewed_at: new Date().toISOString(), reviewer_user_id: context.userId })
        .eq("id", data.reportId);
    } else if (data.action === "unpublish_lesson") {
      await supabaseAdmin.from("posts").update({ published_at: null }).eq("id", report.post_id);
      await supabaseAdmin.from("content_reports")
        .update({ status: "removed", reviewed_at: new Date().toISOString(), reviewer_user_id: context.userId })
        .eq("post_id", report.post_id).eq("status", "pending");
    } else if (data.action === "delete_lesson") {
      await supabaseAdmin.from("posts").delete().eq("id", report.post_id);
      await supabaseAdmin.from("content_reports")
        .update({ status: "removed", reviewed_at: new Date().toISOString(), reviewer_user_id: context.userId })
        .eq("post_id", report.post_id);
    }
    return { ok: true };
  });
