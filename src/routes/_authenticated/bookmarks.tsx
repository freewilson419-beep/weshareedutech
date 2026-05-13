import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

interface Row { id: string; slug: string; title: string; excerpt: string; published_at: string }

export const Route = createFileRoute("/_authenticated/bookmarks")({
  component: Bookmarks,
});

function Bookmarks() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: bm } = await supabase.from("bookmarks").select("post_id").eq("user_id", user.id);
      const ids = bm?.map((b) => b.post_id) ?? [];
      if (!ids.length) return;
      const { data } = await supabase.from("posts").select("id,slug,title,excerpt,published_at").in("id", ids).not("published_at", "is", null);
      setRows((data ?? []) as Row[]);
    })();
  }, [user]);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl">Saved lessons</h1>
      {rows.length === 0 ? (
        <div className="rounded-md border border-dashed bg-card p-12 text-center text-muted-foreground">Nothing saved yet. Tap the bookmark icon on any lesson to keep it here.</div>
      ) : (
        <ul className="divide-y rounded-md border bg-card">
          {rows.map((r) => (
            <li key={r.id} className="p-4">
              <Link to="/p/$slug" params={{ slug: r.slug }} className="block">
                <h3 className="font-serif text-lg">{r.title}</h3>
                <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{r.excerpt}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
