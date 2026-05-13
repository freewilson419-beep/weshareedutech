import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PenLine, Eye, BookmarkIcon, FileText } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ published: 0, drafts: 0, views: 0, bookmarks: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ count: published }, { count: drafts }, { data: posts }, { count: bookmarks }] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_user_id", user.id).not("published_at", "is", null),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_user_id", user.id).is("published_at", null),
        supabase.from("posts").select("id").eq("author_user_id", user.id),
        supabase.from("bookmarks").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);
      let views = 0;
      if (posts?.length) {
        const { count } = await supabase.from("lesson_views").select("id", { count: "exact", head: true }).in("post_id", posts.map((p) => p.id));
        views = count ?? 0;
      }
      setStats({ published: published ?? 0, drafts: drafts ?? 0, views, bookmarks: bookmarks ?? 0 });
    })();
  }, [user]);

  const cards = [
    { label: "Published lessons", value: stats.published, icon: FileText },
    { label: "Drafts", value: stats.drafts, icon: PenLine },
    { label: "Total reads", value: stats.views, icon: Eye },
    { label: "Bookmarks saved", value: stats.bookmarks, icon: BookmarkIcon },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl">Your space</h1>
          <p className="text-muted-foreground">An overview of your contributions to the publication.</p>
        </div>
        <Link to="/compose"><Button><PenLine className="h-4 w-4" /> Write a lesson</Button></Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><Icon className="h-4 w-4" /> {label}</CardTitle></CardHeader>
            <CardContent><p className="font-serif text-3xl">{value}</p></CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
