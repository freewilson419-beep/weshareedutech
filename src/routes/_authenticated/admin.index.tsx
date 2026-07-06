import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCcw, Users, BookOpen, FileText, Eye, Hand, CheckCircle2, MessageSquare, Bookmark, Flag, UserPlus, EyeOff, Activity, TrendingUp } from "lucide-react";
import { adminGetOverview } from "@/lib/admin.functions";
import { authorName, initialsFor } from "@/lib/author-display";
import { Link } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: Overview,
});

function Overview() {
  const fn = useServerFn(adminGetOverview);
  const { data, isLoading, refetch, isFetching } = useQuery({ queryKey: ["admin-overview"], queryFn: () => fn() });

  if (isLoading || !data) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const cards = [
    { label: "Total Users", value: data.stats.users, icon: Users, color: "text-blue-600 bg-blue-100 dark:bg-blue-900/30" },
    { label: "Lessons", value: data.stats.lessons, icon: BookOpen, color: "text-purple-600 bg-purple-100 dark:bg-purple-900/30" },
    { label: "Published", value: data.stats.published, icon: CheckCircle2, color: "text-green-600 bg-green-100 dark:bg-green-900/30" },
    { label: "Drafts", value: data.stats.drafts, icon: FileText, color: "text-orange-600 bg-orange-100 dark:bg-orange-900/30" },
    { label: "Views (7d)", value: data.stats.views7d, icon: Eye, color: "text-cyan-600 bg-cyan-100 dark:bg-cyan-900/30" },
    { label: "Total Claps", value: data.stats.claps, icon: Hand, color: "text-pink-600 bg-pink-100 dark:bg-pink-900/30" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-xl">Platform Overview</h2>
        <Button variant="ghost" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCcw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg ${c.color}`}>
                <c.icon className="h-5 w-5" />
              </div>
              <div className="text-2xl font-bold">{c.value}</div>
              <div className="text-xs text-muted-foreground">{c.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-5">
          <h3 className="mb-3 text-sm font-medium">Users by Role</h3>
          <div className="grid grid-cols-3 gap-3">
            {(["participant", "lecturer", "admin"] as const).map((r) => (
              <div key={r} className="rounded-lg bg-muted/40 p-3 text-center">
                <div className="text-2xl font-bold">{data.roles[r] ?? 0}</div>
                <Badge variant="secondary" className="mt-1 capitalize">{r}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h3 className="mb-3 text-sm font-medium">Recent sign-ups</h3>
          <div className="space-y-2">
            {data.recent.length === 0 && <p className="text-sm text-muted-foreground">No sign-ups yet.</p>}
            {data.recent.map((p: any) => {
              const name = authorName(p, false);
              return (
                <div key={p.user_id} className="flex items-center gap-3 rounded-md p-2 hover:bg-muted/40">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={p.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-xs text-primary">{initialsFor(name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{name}</p>
                    <p className="truncate text-xs text-muted-foreground">{p.department || "—"}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5">
          <h3 className="mb-3 text-sm font-medium">Top lessons this week</h3>
          <div className="space-y-2">
            {data.topLessons.length === 0 && <p className="text-sm text-muted-foreground">No views yet this week.</p>}
            {data.topLessons.map((l: any) => (
              <div key={l.id} className="flex items-center justify-between rounded-md p-2 hover:bg-muted/40">
                <p className="truncate text-sm font-medium">{l.title}</p>
                <span className="ml-3 inline-flex items-center gap-1 text-xs text-muted-foreground"><Eye className="h-3 w-3" /> {l.views}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
