import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

interface Notif { id: string; title: string; body: string; link: string; is_read: boolean; created_at: string; }

export function NotificationsBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<Notif[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(20);
      setItems((data ?? []) as Notif[]);
    };
    load();
    const channel = supabase
      .channel("notif")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const unread = items.filter((n) => !n.is_read).length;

  // When the user opens the bell, delete the notifications they're seeing
  // (they've now "checked" them — no need to keep them stored).
  const clearOnOpen = async () => {
    if (items.length === 0) return;
    const ids = items.map((n) => n.id);
    setItems([]);
    await supabase.from("notifications").delete().in("id", ids);
  };

  return (
    <Popover onOpenChange={(o) => o && clearOnOpen()}>
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
            <a key={n.id} href={n.link || "#"} className="block border-b p-3 text-sm hover:bg-accent">
              <div className="font-medium">{n.title}</div>
              {n.body && <div className="text-muted-foreground">{n.body}</div>}
            </a>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
