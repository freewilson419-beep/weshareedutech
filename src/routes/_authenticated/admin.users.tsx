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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Search, Trash2, RefreshCcw, AtSign, Unlock } from "lucide-react";
import { adminListUsers, adminSetUserRole, adminDeleteUser } from "@/lib/admin.functions";
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
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<{ userId: string; name: string; current: string } | null>(null);
  const [newUsername, setNewUsername] = useState("");
  const [savingUname, setSavingUname] = useState(false);

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
                    {u.department || "—"} · Joined {formatDistanceToNow(new Date(u.created_at), { addSuffix: true })}
                  </p>
                </div>
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
    </div>
  );
}
