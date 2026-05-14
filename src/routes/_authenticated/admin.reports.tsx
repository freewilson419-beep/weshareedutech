import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, Flag, Eye, EyeOff, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { adminListReports, adminResolveReport } from "@/lib/reports.functions";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: AdminReports,
});

function AdminReports() {
  const [status, setStatus] = useState<"pending" | "all">("pending");
  const list = useServerFn(adminListReports);
  const resolve = useServerFn(adminResolveReport);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-reports", status],
    queryFn: () => list({ data: { status } }),
  });

  const act = async (reportId: string, action: "dismiss" | "mark_reviewed" | "unpublish_lesson" | "delete_lesson") => {
    try {
      await resolve({ data: { reportId, action } });
      toast.success("Done");
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
    } catch (e: any) { toast.error(e?.message || "Action failed"); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 font-serif text-xl"><Flag className="h-5 w-5 text-primary" /> Content Reports</h2>
        <p className="text-sm text-muted-foreground">Review flagged lessons and take action.</p>
      </div>
      <Tabs value={status} onValueChange={(v) => setStatus(v as any)}>
        <TabsList>
          <TabsTrigger value="pending">Pending</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : !data || data.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-sm text-muted-foreground">No reports {status === "pending" ? "pending review" : "yet"}.</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {data.map((r: any) => (
            <Card key={r.id}>
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={r.status === "pending" ? "destructive" : "secondary"}>{r.status}</Badge>
                      <Badge variant="outline">{r.reason}</Badge>
                      <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</span>
                    </div>
                    <a href={r.post ? `/p/${r.post.slug}` : "#"} target="_blank" rel="noreferrer" className="mt-2 block truncate text-base font-semibold hover:text-primary">
                      {r.post?.title ?? "(deleted lesson)"}
                    </a>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Reported by {r.reporter?.username || r.reporter?.email || "anonymous user"}
                      {r.post?.published_at ? "" : " · lesson is unpublished"}
                    </p>
                    {r.details && <p className="mt-2 whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm">{r.details}</p>}
                  </div>
                </div>
                {r.status === "pending" && (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="ghost" size="sm" onClick={() => act(r.id, "dismiss")}><X className="h-3 w-3" /> Dismiss</Button>
                    <Button variant="ghost" size="sm" onClick={() => act(r.id, "mark_reviewed")}><Check className="h-3 w-3" /> Mark reviewed</Button>
                    {r.post?.published_at && (
                      <Button variant="outline" size="sm" onClick={() => act(r.id, "unpublish_lesson")}><EyeOff className="h-3 w-3" /> Unpublish lesson</Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm"><Trash2 className="h-3 w-3" /> Delete lesson</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this lesson?</AlertDialogTitle>
                          <AlertDialogDescription>This permanently deletes the lesson and all its comments, claps, and bookmarks.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => act(r.id, "delete_lesson")}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
