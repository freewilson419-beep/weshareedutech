import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Megaphone, Send, Trash2, Loader2 } from "lucide-react";
import { adminBroadcastAnnouncement, adminListAnnouncements, adminDeleteAnnouncement } from "@/lib/admin.functions";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/announcements")({
  component: AdminAnnouncements,
});

function AdminAnnouncements() {
  const broadcast = useServerFn(adminBroadcastAnnouncement);
  const list = useServerFn(adminListAnnouncements);
  const del = useServerFn(adminDeleteAnnouncement);
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["admin-announcements"], queryFn: () => list() });

  const send = async () => {
    if (!title.trim() || !body.trim()) return toast.error("Title and message required");
    setSending(true);
    try {
      const r = await broadcast({ data: { title, body } });
      toast.success(`Sent to ${r.recipients} users`);
      setTitle(""); setBody("");
      qc.invalidateQueries({ queryKey: ["admin-announcements"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSending(false); }
  };

  return (
    <div className="space-y-5">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <h3 className="font-medium">Broadcast to All Users</h3>
          </div>
          <p className="text-xs text-muted-foreground">This message will appear on every user's dashboard and trigger a notification.</p>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title..." />
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write your message here..." rows={4} />
          <Button onClick={send} disabled={sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send to Everyone
          </Button>
        </CardContent>
      </Card>

      <div>
        <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">Past announcements</h4>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <div className="space-y-2">
            {(data ?? []).length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No announcements yet.</p>}
            {(data ?? []).map((a: any) => (
              <Card key={a.id} className="border-l-4 border-l-primary/40">
                <CardContent className="flex items-start gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{a.title}</p>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{a.content}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{formatDistanceToNow(new Date(a.created_at), { addSuffix: true })}</p>
                  </div>
                  <Button
                    variant="ghost" size="icon" className="text-destructive"
                    onClick={async () => {
                      try { await del({ data: { id: a.id } }); qc.invalidateQueries({ queryKey: ["admin-announcements"] }); }
                      catch (e: any) { toast.error(e.message); }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
