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

    const [users, posts, published, drafts, viewsRecent, claps, pCount, lCount, aCount, recent, topRows] = await Promise.all([
      supabaseAdmin.from("profiles").select("user_id", { count: "exact", head: true }),
      supabaseAdmin.from("posts").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("posts").select("id", { count: "exact", head: true }).not("published_at", "is", null),
      supabaseAdmin.from("posts").select("id", { count: "exact", head: true }).is("published_at", null),
      supabaseAdmin.from("lesson_views").select("id", { count: "exact", head: true }).gte("created_at", since),
      supabaseAdmin.from("claps").select("count"),
      supabaseAdmin.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "participant"),
      supabaseAdmin.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "lecturer"),
      supabaseAdmin.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "admin"),
      supabaseAdmin
        .from("profiles")
        .select("user_id,title,surname,othernames,username,department,avatar_url,created_at")
        .order("created_at", { ascending: false })
        .limit(5),
      // Use posts.view_count (trigger-maintained) for top lessons to avoid the 1k cap on lesson_views
      supabaseAdmin
        .from("posts")
        .select("id,title,slug,is_anonymous,author_user_id,view_count")
        .not("published_at", "is", null)
        .order("view_count", { ascending: false })
        .limit(5),
    ]);

    const totalClaps = (claps.data ?? []).reduce((s, r: any) => s + (r.count ?? 0), 0);
    const roleCounts = {
      participant: pCount.count ?? 0,
      lecturer: lCount.count ?? 0,
      admin: aCount.count ?? 0,
    } as Record<string, number>;

    const topLessons = (topRows.data ?? []).map((p: any) => ({ ...p, views: p.view_count ?? 0 }));

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
    // Lift the implicit 1000-row PostgREST cap by paging through profiles.
    const PAGE = 1000;
    const allProfiles: any[] = [];
    for (let from = 0; from < 50000; from += PAGE) {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("user_id,email,title,surname,othernames,username,phone_number,whatsapp_number,department,affiliation,avatar_url,created_at,username_edits_used")
        .order("created_at", { ascending: false })
        .range(from, from + PAGE - 1);
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) break;
      allProfiles.push(...data);
      if (data.length < PAGE) break;
    }
    const allRoles: any[] = [];
    for (let from = 0; from < 50000; from += PAGE) {
      const { data, error } = await supabaseAdmin
        .from("user_roles").select("user_id,role").range(from, from + PAGE - 1);
      if (error) throw new Error(error.message);
      if (!data || data.length === 0) break;
      allRoles.push(...data);
      if (data.length < PAGE) break;
    }
    const roleMap = new Map<string, string>();
    for (const r of allRoles) roleMap.set(r.user_id, r.role);
    return allProfiles.map((p: any) => ({ ...p, role: roleMap.get(p.user_id) ?? "participant" }));
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
      .select("id,title,slug,cover_image_url,is_anonymous,published_at,created_at,author_user_id,view_count")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.filter === "published") q = q.not("published_at", "is", null);
    else if (data.filter === "draft") q = q.is("published_at", null);
    else if (data.filter === "anonymous") q = q.eq("is_anonymous", true);
    if (data.search) q = q.ilike("title", `%${data.search}%`);
    const { data: posts, error } = await q;
    if (error) throw new Error(error.message);

    const authorIds = [...new Set((posts ?? []).map((p: any) => p.author_user_id))];
    const { data: authors } = authorIds.length
      ? await supabaseAdmin
          .from("profiles")
          .select("user_id,title,surname,username,avatar_url")
          .in("user_id", authorIds)
      : { data: [] as any[] };
    const authorMap = new Map<string, any>();
    for (const a of authors ?? []) authorMap.set((a as any).user_id, a);
    return (posts ?? []).map((p: any) => ({
      ...p,
      author: authorMap.get(p.author_user_id) ?? null,
      views: p.view_count ?? 0,
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
      imageUrl: z.string().url().max(1000).regex(/^https?:\/\//i, "Image URL must be http(s)").optional().or(z.literal("")),
      ctaLabel: z.string().min(1).max(40).optional(),
      ctaUrl: z.string().max(500).regex(/^(https?:\/\/|\/)/i, "CTA URL must be http(s) or start with /").optional(),
      targetUserIds: z.array(z.string().uuid()).max(10000).optional(),
      sendEmail: z.boolean().optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const ctaLabel = (data.ctaLabel || "Open").trim();
    const ctaUrl = (data.ctaUrl || "/dashboard").trim();
    const imageUrl = data.imageUrl?.trim() || null;
    const targets = data.targetUserIds && data.targetUserIds.length > 0 ? data.targetUserIds : null;

    const { data: ann, error: aErr } = await supabaseAdmin
      .from("platform_announcements")
      .insert({
        title: data.title, content: data.body, author_user_id: context.userId,
        image_url: imageUrl, cta_label: ctaLabel, cta_url: ctaUrl,
        target_user_ids: targets ?? [],
      })
      .select("id")
      .single();
    if (aErr) throw new Error(aErr.message);

    let usersQuery = supabaseAdmin.from("profiles").select("user_id,email,title,surname,othernames");
    if (targets) usersQuery = usersQuery.in("user_id", targets);
    // Page through users to bypass 1k cap
    const PAGE_U = 1000;
    const allUsers: any[] = [];
    for (let from = 0; from < 100000; from += PAGE_U) {
      const { data } = await usersQuery.range(from, from + PAGE_U - 1);
      if (!data || data.length === 0) break;
      allUsers.push(...data);
      if (data.length < PAGE_U) break;
      if (targets) break; // targeted list is short; one page is enough
    }

    const notifRows = allUsers.map((u: any) => ({
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

    // Pre-render the email ONCE (per-user fields like recipientName are interpolated in template,
    // but we render with a generic name to keep enqueue O(1) per user instead of O(N) renders).
    const tpl = TEMPLATES["announcement"];
    const sharedProps = {
      title: data.title, body: data.body,
      imageUrl: imageUrl || undefined, ctaLabel, ctaUrl,
    };
    const sharedElement = React.createElement(tpl.component, sharedProps);
    const sharedHtml = await render(sharedElement);
    const sharedText = await render(sharedElement, { plainText: true });
    const subject = typeof tpl.subject === "function" ? tpl.subject(sharedProps) : tpl.subject;

    // Pull suppression list once
    const suppressed = new Set<string>();
    {
      const { data: sup } = await supabaseAdmin.from("suppressed_emails").select("email").range(0, 49999);
      for (const r of sup ?? []) suppressed.add(String((r as any).email).toLowerCase());
    }

    let emailsQueued = 0;
    // Parallel enqueue in chunks to avoid serverless timeout on 1k+ users
    const CHUNK = 100;
    for (let i = 0; i < allUsers.length; i += CHUNK) {
      const slice = allUsers.slice(i, i + CHUNK);
      await Promise.all(slice.map(async (u: any) => {
        const email = (u.email || "").trim();
        if (!email || !email.includes("@")) return;
        const lc = email.toLowerCase();
        if (suppressed.has(lc)) return;

        // Reuse or create unsubscribe token
        let unsubToken: string | null = null;
        const { data: existing } = await supabaseAdmin
          .from("email_unsubscribe_tokens").select("token,used_at").eq("email", lc).maybeSingle();
        if (existing && !existing.used_at) unsubToken = existing.token;
        else if (!existing) {
          unsubToken = genToken();
          await supabaseAdmin.from("email_unsubscribe_tokens")
            .upsert({ token: unsubToken, email: lc }, { onConflict: "email", ignoreDuplicates: true });
        } else return;

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
            subject, html: sharedHtml, text: sharedText,
            purpose: "transactional",
            label: "announcement",
            idempotency_key: `announcement-${ann.id}-${u.user_id}`,
            unsubscribe_token: unsubToken,
            queued_at: new Date().toISOString(),
          },
        });
        if (!enqErr) emailsQueued++;
      }));
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
      imageUrl: z.string().url().max(1000).regex(/^https?:\/\//i, "Image URL must be http(s)").optional().or(z.literal("")),
      ctaLabel: z.string().min(1).max(40).optional(),
      ctaUrl: z.string().max(500).regex(/^(https?:\/\/|\/)/i, "CTA URL must be http(s) or start with /").optional(),
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

export const adminGetBilling = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const now = Date.now();
    const since24h = new Date(now - 86_400_000).toISOString();
    const since7d = new Date(now - 7 * 86_400_000).toISOString();
    const since30d = new Date(now - 30 * 86_400_000).toISOString();

    // Email totals (deduped by message_id, latest status)
    const { data: emailRows } = await supabaseAdmin
      .from("email_send_log")
      .select("message_id,template_name,status,created_at,recipient_email")
      .order("created_at", { ascending: false })
      .limit(5000);
    const latestByMsg = new Map<string, any>();
    for (const r of emailRows ?? []) {
      const key = (r as any).message_id ?? (r as any).id;
      if (!latestByMsg.has(key)) latestByMsg.set(key, r);
    }
    const emails = [...latestByMsg.values()];
    const emailStats = { sent: 0, failed: 0, suppressed: 0, pending: 0, last24h: 0, last7d: 0, last30d: 0, total: emails.length };
    const byTemplate: Record<string, number> = {};
    for (const e of emails) {
      const s = (e.status || "").toLowerCase();
      if (s === "sent") emailStats.sent++;
      else if (s === "dlq" || s === "failed" || s === "bounced") emailStats.failed++;
      else if (s === "suppressed") emailStats.suppressed++;
      else if (s === "pending") emailStats.pending++;
      const t = e.created_at;
      if (t >= since24h) emailStats.last24h++;
      if (t >= since7d) emailStats.last7d++;
      if (t >= since30d) emailStats.last30d++;
      byTemplate[e.template_name] = (byTemplate[e.template_name] ?? 0) + 1;
    }
    const recentEmails = emails.slice(0, 15);

    // Storage buckets via raw SQL through PostgREST is not available; query storage.objects via service role
    let storage: Array<{ bucket: string; files: number; bytes: number }> = [];
    try {
      const { data: buckets } = await supabaseAdmin.storage.listBuckets();
      for (const b of buckets ?? []) {
        // Sum sizes by listing — capped at 1000 per call; aggregate across.
        let files = 0; let bytes = 0;
        let offset = 0;
        while (true) {
          const { data: objs } = await supabaseAdmin.storage.from(b.name).list("", { limit: 1000, offset });
          if (!objs || objs.length === 0) break;
          for (const o of objs) {
            files++;
            bytes += (o.metadata as any)?.size ?? 0;
          }
          if (objs.length < 1000) break;
          offset += 1000;
        }
        storage.push({ bucket: b.name, files, bytes });
      }
    } catch (e) {
      // ignore
    }

    // DB row counts
    const tables = [
      "profiles", "posts", "comments", "claps", "bookmarks", "lesson_views",
      "notifications", "platform_announcements", "content_reports",
      "email_send_log", "suppressed_emails", "reading_progress", "user_roles",
    ];
    const rowCounts: Record<string, number> = {};
    await Promise.all(
      tables.map(async (t) => {
        const { count } = await (supabaseAdmin.from(t as any) as any).select("id", { count: "exact", head: true });
        rowCounts[t] = count ?? 0;
      }),
    );

    // Users
    const { count: userCount } = await supabaseAdmin
      .from("profiles").select("user_id", { count: "exact", head: true });
    const { count: newUsers7d } = await supabaseAdmin
      .from("profiles").select("user_id", { count: "exact", head: true }).gte("created_at", since7d);

    // Lesson views
    const { count: views24h } = await supabaseAdmin
      .from("lesson_views").select("id", { count: "exact", head: true }).gte("created_at", since24h);
    const { count: views7d } = await supabaseAdmin
      .from("lesson_views").select("id", { count: "exact", head: true }).gte("created_at", since7d);
    const { count: views30d } = await supabaseAdmin
      .from("lesson_views").select("id", { count: "exact", head: true }).gte("created_at", since30d);

    // Suppressed emails
    const { count: suppressedCount } = await supabaseAdmin
      .from("suppressed_emails").select("id", { count: "exact", head: true });

    return {
      generatedAt: new Date().toISOString(),
      emails: { stats: emailStats, byTemplate, recent: recentEmails, suppressedCount: suppressedCount ?? 0 },
      storage,
      database: { rowCounts },
      users: { total: userCount ?? 0, new7d: newUsers7d ?? 0 },
      activity: { views24h: views24h ?? 0, views7d: views7d ?? 0, views30d: views30d ?? 0 },
    };
  });
