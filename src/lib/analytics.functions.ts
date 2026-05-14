import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

const day = (d: Date) => d.toISOString().slice(0, 10);

export const adminGetAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const now = Date.now();
    const since7 = new Date(now - 7 * 86_400_000).toISOString();
    const since30 = new Date(now - 30 * 86_400_000).toISOString();
    const sinceWeek = new Date(now - 7 * 86_400_000).toISOString();

    const [
      usersTotal, users7d, users30d,
      lessonsTotal, lessonsPub, lessonsThisWeek, lessonsDrafts,
      views30d, claps, comments, bookmarks,
      signupsRows, viewsRows,
      emailSent, emailFailed, suppressed,
    ] = await Promise.all([
      supabaseAdmin.from("profiles").select("user_id", { count: "exact", head: true }),
      supabaseAdmin.from("profiles").select("user_id", { count: "exact", head: true }).gte("created_at", since7),
      supabaseAdmin.from("profiles").select("user_id", { count: "exact", head: true }).gte("created_at", since30),
      supabaseAdmin.from("posts").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("posts").select("id", { count: "exact", head: true }).not("published_at", "is", null),
      supabaseAdmin.from("posts").select("id", { count: "exact", head: true }).not("published_at", "is", null).gte("published_at", sinceWeek),
      supabaseAdmin.from("posts").select("id", { count: "exact", head: true }).is("published_at", null),
      supabaseAdmin.from("lesson_views").select("id", { count: "exact", head: true }).gte("created_at", since30),
      supabaseAdmin.from("claps").select("count"),
      supabaseAdmin.from("comments").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("bookmarks").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("profiles").select("created_at").gte("created_at", since30),
      supabaseAdmin.from("lesson_views").select("post_id,created_at").gte("created_at", since30).limit(20000),
      supabaseAdmin.from("email_send_log").select("id", { count: "exact", head: true }).eq("status", "sent"),
      supabaseAdmin.from("email_send_log").select("id", { count: "exact", head: true }).eq("status", "failed"),
      supabaseAdmin.from("suppressed_emails").select("id", { count: "exact", head: true }),
    ]);

    const totalClaps = (claps.data ?? []).reduce((s, r: any) => s + (r.count ?? 0), 0);

    // Daily signups (last 30d)
    const signupsByDay = new Map<string, number>();
    for (let i = 29; i >= 0; i--) signupsByDay.set(day(new Date(now - i * 86_400_000)), 0);
    for (const r of signupsRows.data ?? []) {
      const k = day(new Date((r as any).created_at));
      if (signupsByDay.has(k)) signupsByDay.set(k, (signupsByDay.get(k) ?? 0) + 1);
    }

    // Top lessons (30d)
    const viewCount = new Map<string, number>();
    for (const v of (viewsRows.data ?? []) as any[]) {
      viewCount.set(v.post_id, (viewCount.get(v.post_id) ?? 0) + 1);
    }
    const topIds = [...viewCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id]) => id);
    let topLessons: any[] = [];
    if (topIds.length) {
      const { data } = await supabaseAdmin
        .from("posts").select("id,title,slug,is_anonymous,author_user_id").in("id", topIds);
      topLessons = (data ?? [])
        .map((p: any) => ({ ...p, views: viewCount.get(p.id) ?? 0 }))
        .sort((a, b) => b.views - a.views);
    }

    // Top authors by published lessons
    const { data: pubPosts } = await supabaseAdmin
      .from("posts").select("author_user_id").not("published_at", "is", null);
    const authorCount = new Map<string, number>();
    for (const p of pubPosts ?? []) {
      authorCount.set((p as any).author_user_id, (authorCount.get((p as any).author_user_id) ?? 0) + 1);
    }
    const topAuthorIds = [...authorCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([id]) => id);
    let topAuthors: any[] = [];
    if (topAuthorIds.length) {
      const { data } = await supabaseAdmin
        .from("profiles").select("user_id,username,title,surname,avatar_url,department")
        .in("user_id", topAuthorIds);
      topAuthors = (data ?? [])
        .map((a: any) => ({ ...a, lessons: authorCount.get(a.user_id) ?? 0 }))
        .sort((a, b) => b.lessons - a.lessons);
    }

    return {
      users: { total: usersTotal.count ?? 0, last7d: users7d.count ?? 0, last30d: users30d.count ?? 0 },
      lessons: {
        total: lessonsTotal.count ?? 0,
        published: lessonsPub.count ?? 0,
        thisWeek: lessonsThisWeek.count ?? 0,
        drafts: lessonsDrafts.count ?? 0,
      },
      engagement: {
        views30d: views30d.count ?? 0,
        claps: totalClaps,
        comments: comments.count ?? 0,
        bookmarks: bookmarks.count ?? 0,
      },
      email: {
        sent: emailSent.count ?? 0,
        failed: emailFailed.count ?? 0,
        suppressed: suppressed.count ?? 0,
      },
      signupsByDay: [...signupsByDay.entries()].map(([date, count]) => ({ date, count })),
      topLessons,
      topAuthors,
    };
  });
