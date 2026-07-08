import { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { safeHref } from "@/lib/safe-url";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { getVapidPublicKey, savePushSubscription } from "@/lib/push.functions";

interface Notif { id: string; title: string; body: string; link: string; is_read: boolean; created_at: string; }

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function registerPush(getKey: () => Promise<{ key: string }>, saveSub: (a: any) => Promise<any>) {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
  // Don't try in cross-origin iframe previews (Lovable editor)
  try { if (window.self !== window.top) return; } catch { return; }
  if (Notification.permission !== "granted") return;

  const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  await navigator.serviceWorker.ready;

  const { key } = await getKey();
  if (!key) return;
  const existing = await reg.pushManager.getSubscription();
  if (existing) {
    // Ensure it's saved on the server (idempotent)
    const j = existing.toJSON() as any;
    if (j?.endpoint && j?.keys?.p256dh && j?.keys?.auth) {
      await saveSub({ data: { endpoint: j.endpoint, keys: { p256dh: j.keys.p256dh, auth: j.keys.auth } } }).catch(() => {});
    }
    return;
  }
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(key),
  });
  const j = sub.toJSON() as any;
  if (j?.endpoint && j?.keys?.p256dh && j?.keys?.auth) {
    await saveSub({ data: { endpoint: j.endpoint, keys: { p256dh: j.keys.p256dh, auth: j.keys.auth } } });
  }
}

export function NotificationsBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);
  const firstLoadRef = useRef(true);
  const getKey = useServerFn(getVapidPublicKey);
  const saveSub = useServerFn(savePushSubscription);

  // Ask for browser notification permission ONCE per session, then register push.
  useEffect(() => {
    if (!user) return;
    if (typeof window === "undefined" || !("Notification" in window)) return;
    const tryRegister = () => { registerPush(getKey, saveSub).catch(() => {}); };
    if (Notification.permission === "granted") {
      tryRegister();
      return;
    }
    if (Notification.permission === "default") {
      const t = setTimeout(() => {
        Notification.requestPermission().then((p) => { if (p === "granted") tryRegister(); }).catch(() => {});
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [user, getKey, saveSub]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(20);
      setItems((data ?? []) as Notif[]);
      firstLoadRef.current = false;
    };
    load();

    const showAlert = (n: Notif) => {
      toast(n.title, { description: n.body || undefined });
      try {
        if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
          const notif = new Notification(n.title, { body: n.body || "", tag: n.id, icon: "/favicon.ico" });
          notif.onclick = () => { window.focus(); if (n.link) window.location.href = safeHref(n.link); };
        }
      } catch { /* ignore */ }
    };

    const channel = supabase
      .channel("notif")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Notif;
          setItems((prev) => [n, ...prev].slice(0, 20));
          if (!firstLoadRef.current) showAlert(n);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const unread = items.filter((n) => !n.is_read).length;

  const markReadOnOpen = async () => {
    const unreadIds = items.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    setItems((prev) => prev.map((n) => (unreadIds.includes(n.id) ? { ...n, is_read: true } : n)));
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
  };

  return (
    <Popover onOpenChange={(o) => o && markReadOnOpen()}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unread > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b p-3 font-semibold">Notifications</div>
        <div className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">You're all caught up</p>
          ) : items.map((n) => (
            <a key={n.id} href={safeHref(n.link)} className={`block border-b p-3 text-sm hover:bg-accent ${!n.is_read ? "bg-accent/40" : ""}`}>
              <div className="font-medium">{n.title}</div>
              {n.body && <div className="text-muted-foreground">{n.body}</div>}
            </a>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
