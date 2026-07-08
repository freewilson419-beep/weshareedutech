// Server-only: send Web Push notifications via VAPID.
import { buildPushPayload } from "@block65/webcrypto-web-push";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

interface PushPayload {
  title: string;
  body?: string;
  url?: string;
  image?: string;
  tag?: string;
}

function getVapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@weshareeduteach.name.ng";
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

interface SubRow { endpoint: string; p256dh: string; auth: string; user_id: string; }

async function sendOne(sub: SubRow, payload: PushPayload, vapid: NonNullable<ReturnType<typeof getVapid>>) {
  const message = {
    data: JSON.stringify(payload),
    options: { ttl: 60 * 60 * 24, urgency: "normal" as const },
  };
  const subscription = {
    endpoint: sub.endpoint,
    expirationTime: null,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  };
  const built = await buildPushPayload(message, subscription, vapid);
  const res = await fetch(sub.endpoint, {
    method: built.method,
    headers: built.headers,
    body: built.body,
  });
  if (res.status === 404 || res.status === 410) {
    // Subscription expired; remove.
    await supabaseAdmin.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
    return { ok: false, gone: true, status: res.status };
  }
  return { ok: res.ok, status: res.status };
}

export async function pushToUsers(userIds: string[] | null, payload: PushPayload) {
  const vapid = getVapid();
  if (!vapid) return { sent: 0, failed: 0, skipped: "no_vapid" as const };
  let query = supabaseAdmin.from("push_subscriptions").select("endpoint,p256dh,auth,user_id");
  if (userIds && userIds.length) query = query.in("user_id", userIds);
  const { data: subs, error } = await query.limit(50000);
  if (error) throw new Error(error.message);
  if (!subs || subs.length === 0) return { sent: 0, failed: 0 };

  let sent = 0, failed = 0;
  const CHUNK = 50;
  for (let i = 0; i < subs.length; i += CHUNK) {
    const slice = subs.slice(i, i + CHUNK) as SubRow[];
    const results = await Promise.allSettled(slice.map((s) => sendOne(s, payload, vapid)));
    for (const r of results) {
      if (r.status === "fulfilled" && r.value.ok) sent++;
      else failed++;
    }
  }
  return { sent, failed };
}
