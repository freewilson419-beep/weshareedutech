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
const SITE_ORIGIN = "https://weshareeduteach.name.ng";

function genToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function assertCanModerate(userId: string, postId: string) {
  const { data: post } = await supabaseAdmin
    .from("posts")
    .select("author_user_id,title,slug,learn_to_teach")
    .eq("id", postId)
    .maybeSingle();
  if (!post) throw new Error("Lesson not found");
  if (post.author_user_id !== userId) {
    const { data: role } = await supabaseAdmin
      .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (!role) throw new Error("Forbidden");
  }
  return post;
}

function clamp10(n: unknown): number {
  const v = Math.round(Number(n));
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(10, v));
}

function audioFormatFromMime(mime: string): string {
  const m = (mime || "").toLowerCase();
  if (m.includes("mp4") || m.includes("m4a") || m.includes("aac")) return "mp4";
  if (m.includes("mp3") || m.includes("mpeg")) return "mp3";
  if (m.includes("wav")) return "wav";
  if (m.includes("ogg")) return "ogg";
  return "webm";
}

async function gradeOne(args: {
  audioBytes: Uint8Array;
  mime: string;
  lessonTitle: string;
  lessonRubric: string;
}): Promise<{ clarity: number; accuracy: number; completeness: number; feedback: string; transcript: string }> {
  const apiKey = process.env.LOVABLE_API_KEY;
  if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

  // base64 the audio
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < args.audioBytes.length; i += chunk) {
    binary += String.fromCharCode(...args.audioBytes.subarray(i, i + chunk));
  }
  const b64 = btoa(binary);
  const format = audioFormatFromMime(args.mime);

  const system = `You are an experienced teaching coach grading short student voice notes where a student tries to teach back a lesson they just learned. Be fair, encouraging, and specific. Output STRICT JSON only.`;

  const userPrompt = `Lesson title: "${args.lessonTitle}"
Lesson material the student should be teaching back:
"""
${(args.lessonRubric || "").slice(0, 6000) || "(no material provided — judge clarity/completeness based on the title)"}
"""

Listen to the attached audio. First, briefly transcribe what the student said (max 600 chars). Then score them on:
- clarity (0-10): how clearly and coherently they spoke
- accuracy (0-10): how factually correct their explanation was vs the lesson material
- completeness (0-10): did they cover the main points

Return STRICT JSON exactly in this shape and nothing else:
{"transcript":"...","clarity":0,"accuracy":0,"completeness":0,"feedback":"2-4 sentences of warm, specific feedback for the student."}`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": apiKey },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            { type: "input_audio", input_audio: { data: b64, format } },
            { type: "text", text: userPrompt },
          ],
        },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`AI gateway ${resp.status}: ${txt.slice(0, 300)}`);
  }

  const json = await resp.json();
  const content: string = json?.choices?.[0]?.message?.content ?? "";
  let parsed: any;
  try {
    parsed = JSON.parse(content);
  } catch {
    const m = content.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("AI returned non-JSON output");
    parsed = JSON.parse(m[0]);
  }
  return {
    clarity: clamp10(parsed.clarity),
    accuracy: clamp10(parsed.accuracy),
    completeness: clamp10(parsed.completeness),
    feedback: String(parsed.feedback ?? "").slice(0, 2000),
    transcript: String(parsed.transcript ?? "").slice(0, 2000),
  };
}

export const listPostSubmissions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ postId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertCanModerate(context.userId, data.postId);
    const { data: subs, error } = await supabaseAdmin
      .from("voice_submissions")
      .select("id,storage_path,duration_seconds,file_size_bytes,created_at,student_user_id,transcript,clarity_score,accuracy_score,completeness_score,total_score,ai_feedback,graded_at,released_at,grading_error")
      .eq("post_id", data.postId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    const ids = [...new Set((subs ?? []).map((s) => s.student_user_id))];
    const { data: profs } = ids.length
      ? await supabaseAdmin.from("profiles").select("user_id,username,title,surname,othernames,email").in("user_id", ids)
      : { data: [] as any[] };
    const profMap = new Map<string, any>();
    for (const p of profs ?? []) profMap.set((p as any).user_id, p);
    const withSigned = await Promise.all(
      (subs ?? []).map(async (s) => {
        const { data: signed } = await supabaseAdmin.storage.from("submissions").createSignedUrl(s.storage_path, 3600);
        const p = profMap.get(s.student_user_id) ?? {};
        const name = [p.title, p.surname, p.othernames || p.username].filter(Boolean).join(" ").trim() || "Anonymous";
        return { ...s, signed_url: signed?.signedUrl, student_name: name, student_email: p.email ?? "" };
      }),
    );
    return withSigned;
  });

export const gradeAllPending = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ postId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const post = await assertCanModerate(context.userId, data.postId);
    const { data: subs } = await supabaseAdmin
      .from("voice_submissions")
      .select("id,storage_path,mime_type")
      .eq("post_id", data.postId)
      .is("graded_at", null);
    let graded = 0, failed = 0;
    for (const s of (subs ?? []) as any[]) {
      try {
        const { data: file, error: dlErr } = await supabaseAdmin.storage.from("submissions").download(s.storage_path);
        if (dlErr || !file) throw new Error(dlErr?.message || "Download failed");
        const bytes = new Uint8Array(await file.arrayBuffer());
        const result = await gradeOne({
          audioBytes: bytes,
          mime: s.mime_type || "audio/webm",
          lessonTitle: (post as any).title || "",
          lessonRubric: (post as any).learn_to_teach || "",
        });
        const total = result.clarity + result.accuracy + result.completeness;
        await supabaseAdmin.from("voice_submissions").update({
          transcript: result.transcript,
          clarity_score: result.clarity,
          accuracy_score: result.accuracy,
          completeness_score: result.completeness,
          total_score: total,
          ai_feedback: result.feedback,
          graded_at: new Date().toISOString(),
          grading_error: "",
        }).eq("id", s.id);
        graded++;
      } catch (e: any) {
        failed++;
        await supabaseAdmin.from("voice_submissions").update({
          grading_error: String(e?.message ?? e).slice(0, 500),
        }).eq("id", s.id);
      }
    }
    return { graded, failed, total: (subs ?? []).length };
  });

export const overrideScore = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      submissionId: z.string().uuid(),
      clarity: z.number().int().min(0).max(10),
      accuracy: z.number().int().min(0).max(10),
      completeness: z.number().int().min(0).max(10),
      feedback: z.string().max(2000).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: sub } = await supabaseAdmin
      .from("voice_submissions").select("post_id,ai_feedback").eq("id", data.submissionId).maybeSingle();
    if (!sub) throw new Error("Submission not found");
    await assertCanModerate(context.userId, sub.post_id);
    const total = data.clarity + data.accuracy + data.completeness;
    const { error } = await supabaseAdmin.from("voice_submissions").update({
      clarity_score: data.clarity,
      accuracy_score: data.accuracy,
      completeness_score: data.completeness,
      total_score: total,
      ai_feedback: data.feedback ?? sub.ai_feedback,
      graded_at: new Date().toISOString(),
      grading_error: "",
    }).eq("id", data.submissionId);
    if (error) throw new Error(error.message);
    return { ok: true, total };
  });

export const releaseGrades = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      postId: z.string().uuid(),
      submissionIds: z.array(z.string().uuid()).optional(),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const post = await assertCanModerate(context.userId, data.postId);
    let q = supabaseAdmin
      .from("voice_submissions")
      .select("id,student_user_id,clarity_score,accuracy_score,completeness_score,total_score,ai_feedback")
      .eq("post_id", data.postId)
      .not("graded_at", "is", null)
      .is("released_at", null);
    if (data.submissionIds?.length) q = q.in("id", data.submissionIds);
    const { data: subs } = await q;
    if (!subs?.length) return { released: 0, emailsQueued: 0 };

    const studentIds = [...new Set(subs.map((s) => s.student_user_id))];
    const { data: profs } = await supabaseAdmin
      .from("profiles").select("user_id,email,title,surname,othernames").in("user_id", studentIds);
    const profMap = new Map<string, any>();
    for (const p of profs ?? []) profMap.set((p as any).user_id, p);

    const ids = subs.map((s) => s.id);
    await supabaseAdmin.from("voice_submissions")
      .update({ released_at: new Date().toISOString() })
      .in("id", ids);

    // In-app notifications
    const lessonUrl = `${SITE_ORIGIN}/p/${(post as any).slug}`;
    const notifRows = subs.map((s) => ({
      user_id: s.student_user_id,
      kind: "grade",
      title: `Your score for "${(post as any).title}"`,
      body: `${s.total_score ?? 0}/30 — open to see feedback`,
      link: `/p/${(post as any).slug}`,
    }));
    await supabaseAdmin.from("notifications").insert(notifRows);

    // Email each
    const tpl = TEMPLATES["grade_released"];
    let emailsQueued = 0;
    for (const s of subs) {
      const p = profMap.get(s.student_user_id);
      const email = (p?.email || "").trim();
      if (!email || !email.includes("@")) continue;
      const lc = email.toLowerCase();
      const { data: sup } = await supabaseAdmin
        .from("suppressed_emails").select("id").eq("email", lc).maybeSingle();
      if (sup) continue;

      let unsubToken: string | null = null;
      const { data: existing } = await supabaseAdmin
        .from("email_unsubscribe_tokens").select("token,used_at").eq("email", lc).maybeSingle();
      if (existing && !existing.used_at) unsubToken = existing.token;
      else if (!existing) {
        unsubToken = genToken();
        await supabaseAdmin.from("email_unsubscribe_tokens")
          .upsert({ token: unsubToken, email: lc }, { onConflict: "email", ignoreDuplicates: true });
      } else continue;

      const name = [p.title, p.surname, p.othernames].filter(Boolean).join(" ").trim() || undefined;
      const props = {
        recipientName: name,
        lessonTitle: (post as any).title,
        clarity: s.clarity_score ?? 0,
        accuracy: s.accuracy_score ?? 0,
        completeness: s.completeness_score ?? 0,
        total: s.total_score ?? 0,
        feedback: s.ai_feedback ?? "",
        lessonUrl,
      };
      const element = React.createElement(tpl.component, props);
      const html = await render(element);
      const text = await render(element, { plainText: true });
      const subject = typeof tpl.subject === "function" ? tpl.subject(props) : tpl.subject;
      const messageId = crypto.randomUUID();
      await supabaseAdmin.from("email_send_log").insert({
        message_id: messageId, template_name: "grade_released",
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
          label: "grade_released",
          idempotency_key: `grade-${s.id}`,
          unsubscribe_token: unsubToken,
          queued_at: new Date().toISOString(),
        },
      });
      if (!enqErr) emailsQueued++;
    }
    return { released: subs.length, emailsQueued };
  });

export const getMyGrades = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: subs } = await supabaseAdmin
      .from("voice_submissions")
      .select("id,post_id,clarity_score,accuracy_score,completeness_score,total_score,ai_feedback,released_at,created_at")
      .eq("student_user_id", context.userId)
      .not("released_at", "is", null)
      .order("released_at", { ascending: false });
    if (!subs?.length) return [];
    const postIds = [...new Set(subs.map((s) => s.post_id))];
    const { data: posts } = await supabaseAdmin
      .from("posts").select("id,title,slug,cover_image_url").in("id", postIds);
    const pm = new Map<string, any>();
    for (const p of posts ?? []) pm.set((p as any).id, p);
    return subs.map((s) => ({ ...s, post: pm.get(s.post_id) ?? null }));
  });
