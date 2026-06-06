import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Megaphone, Send, Trash2, Loader2, Pencil, Mail, ImagePlus, X } from "lucide-react";
import {
  adminBroadcastAnnouncement,
  adminListAnnouncements,
  adminDeleteAnnouncement,
  adminUpdateAnnouncement,
} from "@/lib/admin.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/announcements")({
  component: AdminAnnouncements,
});

interface FormState {
  title: string;
  body: string;
  imageUrl: string;
  ctaLabel: string;
  ctaUrl: string;
}

const empty: FormState = { title: "", body: "", imageUrl: "", ctaLabel: "Open", ctaUrl: "/dashboard" };

function ImagePicker({ userId, value, onChange }: { userId: string; value: string; onChange: (url: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const upload = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Image only");
    if (file.size > 5 * 1024 * 1024) return toast.error("Max 5MB");
    setBusy(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `announcements/${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("post-media").upload(path, file, { contentType: file.type, upsert: true });
    setBusy(false);
    if (error) return toast.error(error.message);
    const { data } = supabase.storage.from("post-media").getPublicUrl(path);
    onChange(data.publicUrl);
  };

  return (
    <div>
      <input
        ref={ref} type="file" accept="image/*" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }}
      />
      {value ? (
        <div className="relative overflow-hidden rounded-md border">
          <img src={value} alt="" className="h-40 w-full object-cover" />
          <Button type="button" variant="secondary" size="icon" className="absolute right-2 top-2 h-7 w-7" onClick={() => onChange("")}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => ref.current?.click()} disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          Add image (optional)
        </Button>
      )}
    </div>
  );
}

function AnnouncementForm({ userId, value, onChange }: { userId: string; value: FormState; onChange: (v: FormState) => void }) {
  const set = (patch: Partial<FormState>) => onChange({ ...value, ...patch });
  return (
    <div className="space-y-3">
      <Input value={value.title} onChange={(e) => set({ title: e.target.value })} placeholder="Announcement title..." />
      <Textarea value={value.body} onChange={(e) => set({ body: e.target.value })} placeholder="Write your message here... (line breaks preserved)" rows={5} />
      <ImagePicker userId={userId} value={value.imageUrl} onChange={(u) => set({ imageUrl: u })} />
      <div className="grid grid-cols-2 gap-2">
        <Input value={value.ctaLabel} onChange={(e) => set({ ctaLabel: e.target.value })} placeholder="Button label (e.g. Open)" />
        <Input value={value.ctaUrl} onChange={(e) => set({ ctaUrl: e.target.value })} placeholder="Button link (e.g. /dashboard)" />
      </div>
      <p className="text-xs text-muted-foreground">Tip: use a path like <code>/dashboard</code> or a full URL. Defaults open the dashboard.</p>
    </div>
  );
}

function AdminAnnouncements() {
  const { user } = useAuth();
  const broadcast = useServerFn(adminBroadcastAnnouncement);
  const update = useServerFn(adminUpdateAnnouncement);
  const list = useServerFn(adminListAnnouncements);
  const del = useServerFn(adminDeleteAnnouncement);
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(empty);
  const [sending, setSending] = useState(false);
  const [sendEmail, setSendEmail] = useState(false);
  const [editing, setEditing] = useState<(FormState & { id: string }) | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const { data, isLoading } = useQuery({ queryKey: ["admin-announcements"], queryFn: () => list() });

  const send = async () => {
    if (!form.title.trim() || !form.body.trim()) return toast.error("Title and message required");
    setSending(true);
    try {
      const r = await broadcast({ data: {
        title: form.title, body: form.body,
        imageUrl: form.imageUrl || undefined,
        ctaLabel: form.ctaLabel || undefined,
        ctaUrl: form.ctaUrl || undefined,
        sendEmail,
      } });
      toast.success(`Sent to ${r.recipients} users${sendEmail ? ` · ${r.emailsQueued} email(s) queued` : " (in-app only)"}`);
      setForm(empty);
      qc.invalidateQueries({ queryKey: ["admin-announcements"] });
    } catch (e: any) { toast.error(e.message); }
    finally { setSending(false); }
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (!editing.title.trim() || !editing.body.trim()) return toast.error("Title and message required");
    setEditSaving(true);
    try {
      await update({ data: {
        id: editing.id, title: editing.title, body: editing.body,
        imageUrl: editing.imageUrl || undefined,
        ctaLabel: editing.ctaLabel || undefined,
        ctaUrl: editing.ctaUrl || undefined,
      } });
      toast.success("Announcement updated");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-announcements"] });
    } catch (e: any) { toast.error(e.message); }
    finally { setEditSaving(false); }
  };

  if (!user) return null;

  return (
    <div className="space-y-5">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <h3 className="font-medium">Broadcast to All Users</h3>
          </div>
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <Mail className="h-3 w-3" /> Posts to every user's notification bell (browser alert). Email is optional.
          </p>
          <AnnouncementForm userId={user.id} value={form} onChange={setForm} />
          <label className="flex items-center gap-2 rounded-md border bg-muted/30 p-2 text-sm">
            <input type="checkbox" checked={sendEmail} onChange={(e) => setSendEmail(e.target.checked)} />
            Also send as email (slower, uses email quota)
          </label>
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
                <CardContent className="flex items-start gap-2 p-4">
                  {a.image_url && <img src={a.image_url} alt="" className="h-14 w-14 shrink-0 rounded object-cover" />}
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{a.title}</p>
                    <p className="line-clamp-2 whitespace-pre-wrap text-sm text-muted-foreground">{a.content}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(a.created_at), { addSuffix: true })} · CTA: {a.cta_label} → {a.cta_url}
                    </p>
                  </div>
                  <Button
                    variant="ghost" size="icon"
                    onClick={() => setEditing({
                      id: a.id, title: a.title, body: a.content,
                      imageUrl: a.image_url ?? "",
                      ctaLabel: a.cta_label ?? "Open",
                      ctaUrl: a.cta_url ?? "/dashboard",
                    })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" className="text-destructive"
                    onClick={async () => {
                      if (!confirm("Delete this announcement?")) return;
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

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit announcement</DialogTitle>
          </DialogHeader>
          {editing && (
            <>
              <AnnouncementForm
                userId={user.id}
                value={editing}
                onChange={(v) => setEditing({ ...editing, ...v })}
              />
              <p className="text-xs text-muted-foreground">
                Edits update the in-app notification. Emails already sent can't be recalled.
              </p>
            </>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={editSaving}>
              {editSaving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
