import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, BarChart3, Users, BookOpen, Eye, Hand, MessageSquare, Bookmark, Mail } from "lucide-react";
import { adminGetAnalytics } from "@/lib/analytics.functions";
import { authorName, initialsFor } from "@/lib/author-display";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export const Route = createFileRoute("/_authenticated/admin/analytics")({
  component: AdminAnalytics,
});

function AdminAnalytics() {
  const fn = useServerFn(adminGetAnalytics);
  const { data, isLoading } = useQuery({ queryKey: ["admin-analytics"], queryFn: () => fn() });

  if (isLoading || !data) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  const max = Math.max(1, ...data.signupsByDay.map((d) => d.count));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 font-serif text-xl"><BarChart3 className="h-5 w-5 text-primary" /> Analytics</h2>
        <p className="text-sm text-muted-foreground">Founder dashboard — users, lessons, engagement.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat icon={Users} label="Total users" value={data.users.total} />
        <Stat icon={Users} label="New (7d)" value={data.users.last7d} />
        <Stat icon={Users} label="New (30d)" value={data.users.last30d} />
        <Stat icon={BookOpen} label="Published lessons" value={data.lessons.published} />
        <Stat icon={BookOpen} label="Lessons this week" value={data.lessons.thisWeek} />
        <Stat icon={BookOpen} label="Drafts" value={data.lessons.drafts} />
        <Stat icon={Eye} label="Views (30d)" value={data.engagement.views30d} />
        <Stat icon={Hand} label="Total claps" value={data.engagement.claps} />
        <Stat icon={MessageSquare} label="Comments" value={data.engagement.comments} />
        <Stat icon={Bookmark} label="Bookmarks" value={data.engagement.bookmarks} />
        <Stat icon={Mail} label="Emails sent" value={data.email.sent} />
        <Stat icon={Mail} label="Emails failed" value={data.email.failed} />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="mb-3 text-sm font-semibold">Signups (last 30 days)</div>
          <div className="flex h-32 items-end gap-1">
            {data.signupsByDay.map((d) => (
              <div key={d.date} className="flex-1 rounded-t bg-primary/70 hover:bg-primary" style={{ height: `${(d.count / max) * 100}%` }} title={`${d.date}: ${d.count}`} />
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 text-sm font-semibold">Top lessons (30d)</div>
            <ul className="space-y-2">
              {data.topLessons.length === 0 && <li className="text-sm text-muted-foreground">No views yet.</li>}
              {data.topLessons.map((l: any, i: number) => (
                <li key={l.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate"><span className="text-muted-foreground">{i + 1}.</span> {l.title}</span>
                  <span className="text-xs text-muted-foreground">{l.views} views</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 text-sm font-semibold">Top authors</div>
            <ul className="space-y-2">
              {data.topAuthors.length === 0 && <li className="text-sm text-muted-foreground">No published lessons yet.</li>}
              {data.topAuthors.map((a: any) => {
                const name = authorName(a, false);
                return (
                  <li key={a.user_id} className="flex items-center gap-2 text-sm">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={a.avatar_url || undefined} alt={name} />
                      <AvatarFallback className="bg-primary/10 text-[10px] text-primary">{initialsFor(name)}</AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate">{name}</span>
                    <span className="text-xs text-muted-foreground">{a.lessons} lessons</span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}
