import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Search, Trash2, RefreshCcw, AtSign, Unlock, Megaphone, Send } from "lucide-react";
import { adminListUsers, adminSetUserRole, adminDeleteUser, adminBroadcastAnnouncement } from "@/lib/admin.functions";
import { adminResetUsernameEdit, adminSetUsername } from "@/lib/account.functions";
import { authorName, initialsFor } from "@/lib/author-display";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const { user } = useAuth();
  const list = useServerFn(adminListUsers);
  const setRole = useServerFn(adminSetUserRole);
  const del = useServerFn(adminDeleteUser);
  const resetEditFn = useServerFn(adminResetUsernameEdit);
  const setUsernameFn = useServerFn(adminSetUsername);
  const broadcast = useServerFn(adminBroadcastAnnouncement);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ userId: string; name: string; current: string } | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [savingUname, setSavingUname] = useState(false);
  const [announceTarget, setAnnounceTarget] = useState<{ userId: string; name: string } | null>(null);
  const [aTitle, setATitle] = useState("");
  const [aBody, setABody] = useState("");
  const [aSending, setASending] = useState(false);

  const { data, isLoading, refetch, isFetching } = useQuery({ queryKey: ["admin-users"], queryFn: () => list() });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase().trim();
    if (!q) return data;
    return data.filter((u: any) =>
      `${u.title} ${u.surname} ${u.othernames} ${u.username} ${u.email} ${u.department}`.toLowerCase().includes(q),
    );
  }, [data, search]);

  const onRoleChange = async (userId: string, role: string) => {
    try {
      await setRole({ data: { userId, role: role as any } });
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const onDelete = async (userId: string) => {
    try {
      await del({ data: { userId } });
      toast.success("User deleted");
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const onResetEdit = async (userId: string, name: string) => {
    try {
      await resetEditFn({ data: { userId } });
      toast.success(`${name} can change their username again`);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    }
  };

  const onSaveUsername = async () => {
    if (!editing) return;
    const v = newUsername.trim();
    if (!/^[a-zA-Z0-9_.-]{3,30}$/.test(v)) return toast.error("3–30 chars; letters, numbers, . _ -");
    setSavingUname(true);
    try {
      await setUsernameFn({ data: { userId: editing.userId, username: v } });
      toast.success("Username updated");
      setEditing(null);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setSavingUname(false);
    }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name, email, department..." className="pl-9" />
        </div>
        <Button variant="ghost" size="icon" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCcw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
        <span className="whitespace-nowrap text-xs text-muted-foreground">{filtered.length} users</span>
      </div>

      <div className="space-y-2">
        {filtered.map((u: any) => {
          const name = authorName(u, false);
          const isSelf = u.user_id === user?.id;
          return (
            <Card key={u.user_id}>
              <CardContent className="flex items-center gap-3 p-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={u.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/10 text-xs text-primary">{initialsFor(name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{name}</p>
                    <Badge variant="secondary" className="capitalize">{u.role}</Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    @{u.username || "—"} · {u.department || "—"} · Joined {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                    {(u.username_edits_used ?? 0) >= 1 && <span className="ml-1 text-amber-600">(used username edit)</span>}
                  </p>
                </div>
                <Button variant="ghost" size="icon" title="Edit username" onClick={() => { setEditing({ userId: u.user_id, name, current: u.username || "" }); setNewUsername(u.username || ""); }}>
                  <AtSign className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" title="Send announcement to this user" onClick={() => { setAnnounceTarget({ userId: u.user_id, name }); setATitle(""); setABody(""); }}>
                  <Megaphone className="h-4 w-4" />
                </Button>
                {(u.username_edits_used ?? 0) >= 1 && (
                  <Button variant="ghost" size="icon" title="Allow user to change their username again" onClick={() => onResetEdit(u.user_id, name)}>
                    <Unlock className="h-4 w-4" />
                  </Button>
                )}
                <Select value={u.role} onValueChange={(v) => onRoleChange(u.user_id, v)} disabled={isSelf}>
                  <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="participant">Participant</SelectItem>
                    <SelectItem value="lecturer">Lecturer</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive" disabled={isSelf}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete {name}?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This permanently removes the user and their lessons. Cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(u.user_id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No users match.</p>}
      </div>

      <Dialog open={!!editing} onOpenChange={(v) => { if (!v) setEditing(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set username for {editing?.name}</DialogTitle>
            <DialogDescription>
              This overrides the user's current username. It does not consume their one free change.
            </DialogDescription>
          </DialogHeader>
          <Input value={newUsername} onChange={(e) => setNewUsername(e.target.value.replace(/\s+/g, ""))} placeholder="new-username" maxLength={30} />
          <p className="text-xs text-muted-foreground">3–30 chars · letters, numbers, dot, underscore, dash</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={onSaveUsername} disabled={savingUname}>
              {savingUname ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!announceTarget} onOpenChange={(v) => { if (!v) setAnnounceTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send announcement to {announceTarget?.name}</DialogTitle>
            <DialogDescription>
              Sends an in-app notification and a branded email — only to this user.
            </DialogDescription>
          </DialogHeader>
          <Input value={aTitle} onChange={(e) => setATitle(e.target.value)} placeholder="Title…" maxLength={200} />
          <Textarea value={aBody} onChange={(e) => setABody(e.target.value)} placeholder="Message…" rows={5} maxLength={4000} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAnnounceTarget(null)}>Cancel</Button>
            <Button
              disabled={aSending || !aTitle.trim() || !aBody.trim()}
              onClick={async () => {
                if (!announceTarget) return;
                setASending(true);
                try {
                  const r = await broadcast({ data: { title: aTitle, body: aBody, targetUserIds: [announceTarget.userId] } });
                  toast.success(`Sent · ${r.emailsQueued} email queued`);
                  setAnnounceTarget(null);
                } catch (e: any) {
                  toast.error(e?.message ?? "Failed");
                } finally { setASending(false); }
              }}
            >
              {aSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
