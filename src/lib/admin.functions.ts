import * as React from "react";
import { createServerFn } from "@tanstack/react-start";
import { render } from "@react-email/components";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { TEMPLATES } from "@/lib/email-templates/registry";

const EMAIL_SITE_NAME = "weshareedutech";
const EMAIL_SENDER_DOMAIN = "notify.weshareeduteach.name.ng";
const EMAIL_FROM_DOMAIN = "weshareeduteach.name.ng";

function genToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Forbidden: admin only");
}

export const adminGetOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const since = new Date(Date.now() - 7 * 86_400_000).toISOString();

    const [users, posts, published, drafts, viewsRecent, claps, roles, recent, topRows] = await Promise.all([
      supabaseAdmin.from("profiles").select("user_id", { count: "exact", head: true }),
      supabaseAdmin.from("posts").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("posts").select("id", { count: "exact", head: true }).not("published_at", "is", null),
      supabaseAdmin.from("posts").select("id", { count: "exact", head: true }).is("published_at", null),
      supabaseAdmin.from("lesson_views").select("id", { count: "exact", head: true }).gte("created_at", since),
      supabaseAdmin.from("claps").select("count"),
      supabaseAdmin.from("user_roles").select("role"),
      supabaseAdmin
        .from("profiles")
        .select("user_id,title,surname,othernames,username,department,avatar_url,created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      supabaseAdmin
        .from("lesson_views")
        .select("post_id")
        .gte("created_at", since)
        .limit(5000),
    ]);

    const totalClaps = (claps.data ?? []).reduce((s, r: any) => s + (r.count ?? 0), 0);
    const roleCounts = { admin: 0, lecturer: 0, participant: 0 } as Record<string, number>;
    for (const r of roles.data ?? []) roleCounts[(r as any).role] = (roleCounts[(r as any).role] ?? 0) + 1;

    const viewCount = new Map<string, number>();
    for (const v of (topRows.data ?? []) as any[]) viewCount.set(v.post_id, (viewCount.get(v.post_id) ?? 0) + 1);
    const topIds = [...viewCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
    let topLessons: any[] = [];
    if (topIds.length) {
      const { data } = await supabaseAdmin
        .from("posts")
        .select("id,title,slug,is_anonymous,author_user_id")
        .in("id", topIds);
      topLessons = (data ?? []).map((p: any) => ({ ...p, views: viewCount.get(p.id) ?? 0 }))
        .sort((a, b) => b.views - a.views);
    }

    return {
      stats: {
        users: users.count ?? 0,
        lessons: posts.count ?? 0,
        published: published.count ?? 0,
        drafts: drafts.count ?? 0,
        views7d: viewsRecent.count ?? 0,
        claps: totalClaps,
      },
      roles: roleCounts,
      recent: recent.data ?? [],
      topLessons,
    };
  });

export const adminListUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const [{ data: profiles }, { data: roles }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("user_id,email,title,surname,othernames,username,department,affiliation,avatar_url,created_at")
        .order("created_at", { ascending: false }),
      supabaseAdmin.from("user_roles").select("user_id,role"),
    ]);
    const roleMap = new Map<string, string>();
    for (const r of roles ?? []) roleMap.set((r as any).user_id, (r as any).role);
    return (profiles ?? []).map((p: any) => ({ ...p, role: roleMap.get(p.user_id) ?? "participant" }));
  });

export const adminSetUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid(), role: z.enum(["admin", "lecturer", "participant"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.userId === context.userId && data.role !== "admin") {
      throw new Error("You cannot demote yourself");
    }
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin.from("user_roles").insert({ user_id: data.userId, role: data.role });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ userId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.userId === context.userId) throw new Error("You cannot delete yourself");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    await supabaseAdmin.from("profiles").delete().eq("user_id", data.userId);
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    return { ok: true };
  });

export const adminListLessons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      search: z.string().optional().default(""),
      filter: z.enum(["all", "published", "draft", "anonymous"]).optional().default("all"),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("posts")
      .select("id,title,slug,cover_image_url,is_anonymous,published_at,created_at,author_user_id")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.filter === "published") q = q.not("published_at", "is", null);
    else if (data.filter === "draft") q = q.is("published_at", null);
    else if (data.filter === "anonymous") q = q.eq("is_anonymous", true);
    if (data.search) q = q.ilike("title", `%${data.search}%`);
    const { data: posts, error } = await q;
    if (error) throw new Error(error.message);

    const authorIds = [...new Set((posts ?? []).map((p: any) => p.author_user_id))];
    const [{ data: authors }, { data: views }] = await Promise.all([
      authorIds.length
        ? supabaseAdmin
            .from("profiles")
            .select("user_id,title,surname,username,avatar_url")
            .in("user_id", authorIds)
        : Promise.resolve({ data: [] as any[] }),
      supabaseAdmin.from("lesson_views").select("post_id"),
    ]);
    const authorMap = new Map<string, any>();
    for (const a of authors ?? []) authorMap.set((a as any).user_id, a);
    const viewMap = new Map<string, number>();
    for (const v of (views ?? []) as any[]) viewMap.set(v.post_id, (viewMap.get(v.post_id) ?? 0) + 1);
    return (posts ?? []).map((p: any) => ({
      ...p,
      author: authorMap.get(p.author_user_id) ?? null,
      views: viewMap.get(p.id) ?? 0,
    }));
  });

export const adminTogglePublish = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ postId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: row } = await supabaseAdmin.from("posts").select("published_at").eq("id", data.postId).maybeSingle();
    const newVal = row?.published_at ? null : new Date().toISOString();
    const { error } = await supabaseAdmin.from("posts").update({ published_at: newVal }).eq("id", data.postId);
    if (error) throw new Error(error.message);
    return { published: !!newVal };
  });

export const adminDeleteLesson = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ postId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("posts").delete().eq("id", data.postId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminBroadcastAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      title: z.string().min(1).max(200),
      body: z.string().min(1).max(4000),
      imageUrl: z.string().url().max(1000).optional().or(z.literal("")),
      ctaLabel: z.string().min(1).max(40).optional(),
      ctaUrl: z.string().min(1).max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const ctaLabel = (data.ctaLabel || "Open").trim();
    const ctaUrl = (data.ctaUrl || "/dashboard").trim();
    const imageUrl = data.imageUrl?.trim() || null;
    const { data: ann, error: aErr } = await supabaseAdmin
      .from("platform_announcements")
      .insert({
        title: data.title, content: data.body, author_user_id: context.userId,
        image_url: imageUrl, cta_label: ctaLabel, cta_url: ctaUrl,
      })
      .select("id")
      .single();
    if (aErr) throw new Error(aErr.message);

    const { data: users } = await supabaseAdmin
      .from("profiles")
      .select("user_id,email,title,surname,othernames");

    const notifRows = (users ?? []).map((u: any) => ({
      user_id: u.user_id,
      kind: "announcement",
      title: data.title,
      body: data.body,
      link: ctaUrl,
    }));
    if (notifRows.length) {
      for (let i = 0; i < notifRows.length; i += 500) {
        await supabaseAdmin.from("notifications").insert(notifRows.slice(i, i + 500));
      }
    }

    // Render + enqueue an email per user (queue handles rate limits + retries)
    const tpl = TEMPLATES["announcement"];
    let emailsQueued = 0;
    for (const u of (users ?? []) as any[]) {
      const email = (u.email || "").trim();
      if (!email || !email.includes("@")) continue;
      const lc = email.toLowerCase();
      const { data: sup } = await supabaseAdmin
        .from("suppressed_emails").select("id").eq("email", lc).maybeSingle();
      if (sup) continue;

      // Reuse or create unsubscribe token
      let unsubToken: string | null = null;
      const { data: existing } = await supabaseAdmin
        .from("email_unsubscribe_tokens").select("token,used_at").eq("email", lc).maybeSingle();
      if (existing && !existing.used_at) unsubToken = existing.token;
      else if (!existing) {
        unsubToken = genToken();
        await supabaseAdmin.from("email_unsubscribe_tokens")
          .upsert({ token: unsubToken, email: lc }, { onConflict: "email", ignoreDuplicates: true });
      } else continue;

      const name = [u.title, u.surname, u.othernames].filter(Boolean).join(" ").trim() || undefined;
      const props = {
        title: data.title, body: data.body, recipientName: name,
        imageUrl: imageUrl || undefined, ctaLabel, ctaUrl,
      };
      const element = React.createElement(tpl.component, props);
      const html = await render(element);
      const text = await render(element, { plainText: true });
      const subject = typeof tpl.subject === "function" ? tpl.subject(props) : tpl.subject;
      const messageId = crypto.randomUUID();

      await supabaseAdmin.from("email_send_log").insert({
        message_id: messageId, template_name: "announcement",
        recipient_email: email, status: "pending",
      });

      const { error: enqErr } = await supabaseAdmin.rpc("enqueue_email", {
        queue_name: "transactional_emails",
        payload: {
          message_id: messageId,
          to: email,
          from: `${EMAIL_SITE_NAME} <noreply@${EMAIL_FROM_DOMAIN}>`,
          sender_domain: EMAIL_SENDER_DOMAIN,
          subject, html, text,
          purpose: "transactional",
          label: "announcement",
          idempotency_key: `announcement-${ann.id}-${u.user_id}`,
          unsubscribe_token: unsubToken,
          queued_at: new Date().toISOString(),
        },
      });
      if (!enqErr) emailsQueued++;
    }

    return { id: ann.id, recipients: notifRows.length, emailsQueued };
  });

export const adminUpdateAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      id: z.string().uuid(),
      title: z.string().min(1).max(200),
      body: z.string().min(1).max(4000),
      imageUrl: z.string().url().max(1000).optional().or(z.literal("")),
      ctaLabel: z.string().min(1).max(40).optional(),
      ctaUrl: z.string().min(1).max(500).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: prev, error: pErr } = await supabaseAdmin
      .from("platform_announcements")
      .select("title,content")
      .eq("id", data.id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!prev) throw new Error("Announcement not found");

    const ctaLabel = (data.ctaLabel || "Open").trim();
    const ctaUrl = (data.ctaUrl || "/dashboard").trim();
    const imageUrl = data.imageUrl?.trim() || null;

    const { error } = await supabaseAdmin
      .from("platform_announcements")
      .update({
        title: data.title, content: data.body,
        image_url: imageUrl, cta_label: ctaLabel, cta_url: ctaUrl,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("notifications")
      .update({ title: data.title, body: data.body, link: ctaUrl })
      .eq("kind", "announcement")
      .eq("title", prev.title)
      .eq("body", prev.content);

    return { ok: true };
  });

export const adminListAnnouncements = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin
      .from("platform_announcements")
      .select("id,title,content,image_url,cta_label,cta_url,created_at")
      .order("created_at", { ascending: false })
      .limit(50);
    return data ?? [];
  });

export const adminDeleteAnnouncement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("platform_announcements").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminGetSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin.from("settings").select("key,value");
    const map: Record<string, string> = {};
    for (const r of data ?? []) map[(r as any).key] = (r as any).value ?? "";
    return map;
  });

export const adminSaveSetting = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ key: z.string().min(1).max(100), value: z.string().max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: existing } = await supabaseAdmin.from("settings").select("id").eq("key", data.key).maybeSingle();
    if (existing) {
      await supabaseAdmin.from("settings").update({ value: data.value, updated_at: new Date().toISOString() }).eq("key", data.key);
    } else {
      await supabaseAdmin.from("settings").insert({ key: data.key, value: data.value });
    }
    return { ok: true };
  });
