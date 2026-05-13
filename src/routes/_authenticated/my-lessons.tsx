import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PenLine } from "lucide-react";

interface Row { id: string; slug: string; title: string; excerpt: string; published_at: string | null; updated_at: string }

export const Route = createFileRoute("/_authenticated/my-lessons")({
  component: MyLessons,
});

function MyLessons() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("posts")
        .select("id,slug,title,excerpt,published_at,updated_at")
        .eq("author_user_id", user.id)
        .order("updated_at", { ascending: false });
      setRows((data ?? []) as Row[]);
    })();
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl">My lessons</h1>
        <Link to="/compose"><Button><PenLine className="h-4 w-4" /> New lesson</Button></Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed bg-card p-12 text-center text-muted-foreground">You haven't written anything yet.</div>
      ) : (
        <ul className="divide-y rounded-md border bg-card">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="truncate font-serif text-lg">{r.title}</h3>
                  {r.published_at ? <Badge variant="secondary">Published</Badge> : <Badge variant="outline">Draft</Badge>}
                </div>
                <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{r.excerpt || "No excerpt"}</p>
              </div>
              <div className="flex gap-2">
                {r.published_at && <Link to="/p/$slug" params={{ slug: r.slug }}><Button variant="ghost" size="sm">View</Button></Link>}
                <Link to="/compose" search={{ id: r.id }}><Button variant="outline" size="sm">Edit</Button></Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
