import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Search, Trash2, Eye, EyeOff, ExternalLink } from "lucide-react";
import { adminListLessons, adminTogglePublish, adminDeleteLesson } from "@/lib/admin.functions";
import { authorName } from "@/lib/author-display";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/lessons")({
  component: AdminLessons,
});

const filters = [
  { id: "all", label: "All" },
  { id: "published", label: "Published" },
  { id: "draft", label: "Drafts" },
  { id: "anonymous", label: "Anonymous" },
] as const;

function AdminLessons() {
  const list = useServerFn(adminListLessons);
  const toggle = useServerFn(adminTogglePublish);
  const del = useServerFn(adminDeleteLesson);
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<typeof filters[number]["id"]>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-lessons", search, filter],
    queryFn: () => list({ data: { search, filter } }),
  });

  const onToggle = async (postId: string) => {
    try {
      const r = await toggle({ data: { postId } });
      toast.success(r.published ? "Published" : "Unpublished");
      qc.invalidateQueries({ queryKey: ["admin-lessons"] });
    } catch (e: any) { toast.error(e.message); }
  };
  const onDelete = async (postId: string) => {
    try {
      await del({ data: { postId } });
      toast.success("Lesson deleted");
      qc.invalidateQueries({ queryKey: ["admin-lessons"] });
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search lessons..." className="pl-9" />
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {filters.map((f) => (
          <Button key={f.id} size="sm" variant={filter === f.id ? "default" : "outline"} onClick={() => setFilter(f.id)}>
            {f.label}
          </Button>
        ))}
      </div>

      {isLoading || !data ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="space-y-2">
          {data.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No lessons.</p>}
          {data.map((l: any) => (
            <Card key={l.id}>
              <CardContent className="flex items-center gap-3 p-3">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-muted">
                  {l.cover_image_url && <img src={l.cover_image_url} alt="" className="h-full w-full object-cover" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-medium">{l.title}</p>
                    {l.is_anonymous && <Badge variant="outline" className="text-xs">Anon</Badge>}
                    <Badge variant={l.published_at ? "default" : "secondary"} className="text-xs">
                      {l.published_at ? "Published" : "Draft"}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    By {authorName(l.author, l.is_anonymous)} · {l.views} views · {formatDistanceToNow(new Date(l.created_at), { addSuffix: true })}
                  </p>
                </div>
                {l.published_at && (
                  <Button asChild variant="ghost" size="icon">
                    <Link to="/p/$slug" params={{ slug: l.slug }}><ExternalLink className="h-4 w-4" /></Link>
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={() => onToggle(l.id)} title={l.published_at ? "Unpublish" : "Publish"}>
                  {l.published_at ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this lesson?</AlertDialogTitle>
                      <AlertDialogDescription>"{l.title}" will be permanently removed.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => onDelete(l.id)} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
