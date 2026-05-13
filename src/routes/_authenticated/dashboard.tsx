import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PenLine, Eye, BookmarkIcon, FileText, Sparkles, Flame, Clock, ArrowRight, BookOpen, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

interface Feed {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_image_url: string;
  tags: string[];
  read_time_minutes: number;
  published_at: string;
  author_user_id: string;
  author_name?: string;
}

interface MyPost {
  id: string;
  slug: string;
  title: string;
  published_at: string | null;
  updated_at: string;
}

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ published: 0, drafts: 0, views: 0, bookmarks: 0 });
  const [feed, setFeed] = useState<Feed[]>([]);
  const [mine, setMine] = useState<MyPost[]>([]);
  const [greeting, setGreeting] = useState("Welcome");
  const [name, setName] = useState("");

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ count: published }, { count: drafts }, { data: posts }, { count: bookmarks }, { data: profile }] = await Promise.all([
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_user_id", user.id).not("published_at", "is", null),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_user_id", user.id).is("published_at", null),
        supabase.from("posts").select("id,slug,title,published_at,updated_at").eq("author_user_id", user.id).order("updated_at", { ascending: false }).limit(5),
        supabase.from("bookmarks").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("profiles").select("username,surname,title").eq("user_id", user.id).maybeSingle(),
      ]);

      let views = 0;
      if (posts?.length) {
        const { count } = await supabase.from("lesson_views").select("id", { count: "exact", head: true }).in("post_id", posts.map((p) => p.id));
        views = count ?? 0;
      }
      setStats({ published: published ?? 0, drafts: drafts ?? 0, views, bookmarks: bookmarks ?? 0 });
      setMine((posts ?? []) as MyPost[]);
      if (profile) setName(profile.username || profile.surname || "");

      // Community feed
      const { data: latest } = await supabase
        .from("posts")
        .select("id,slug,title,excerpt,cover_image_url,tags,read_time_minutes,published_at,author_user_id")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(8);

      if (latest?.length) {
        const ids = Array.from(new Set(latest.map((p) => p.author_user_id)));
        const { data: profiles } = await supabase.from("profiles").select("user_id,username,title,surname").in("user_id", ids);
        const map = new Map(profiles?.map((p) => [p.user_id, p]) ?? []);
        setFeed(latest.map((p) => {
          const a = map.get(p.author_user_id);
          return { ...p, author_name: a ? `${a.title ? a.title + " " : ""}${a.username || a.surname || "Anonymous"}` : "Anonymous" };
        }));
      }
    })();
  }, [user]);

  const cards = [
    { label: "Published", value: stats.published, icon: FileText, accent: "from-primary/20 to-primary/5" },
    { label: "Drafts", value: stats.drafts, icon: PenLine, accent: "from-amber-500/20 to-amber-500/5" },
    { label: "Total reads", value: stats.views, icon: Eye, accent: "from-emerald-500/20 to-emerald-500/5" },
    { label: "Saved", value: stats.bookmarks, icon: BookmarkIcon, accent: "from-violet-500/20 to-violet-500/5" },
  ];

  return (
    <div className="space-y-10">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/10 via-background to-background p-6 md:p-10">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-primary/5 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-background/60 px-3 py-1 text-xs text-primary backdrop-blur">
              <Sparkles className="h-3 w-3" /> {greeting}{name ? `, ${name}` : ""}
            </div>
            <h1 className="font-serif text-3xl leading-tight md:text-5xl">
              Your stage to <span className="text-primary">teach</span>,<br className="hidden md:block" /> your library to <span className="text-primary">learn</span>.
            </h1>
            <p className="mt-3 text-muted-foreground md:text-lg">
              Pick up a draft, ship a new lesson, or dive into what the community just published.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/compose"><Button size="lg" className="shadow-lg shadow-primary/20"><PenLine className="h-4 w-4" /> Write a lesson</Button></Link>
            <Link to="/my-lessons"><Button size="lg" variant="outline"><FileText className="h-4 w-4" /> My lessons</Button></Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {cards.map(({ label, value, icon: Icon, accent }) => (
          <Card key={label} className="relative overflow-hidden border-border/60">
            <div className={`absolute inset-0 bg-gradient-to-br ${accent} opacity-60`} />
            <CardContent className="relative p-5">
              <Icon className="mb-3 h-5 w-5 text-foreground/70" />
              <p className="font-serif text-3xl md:text-4xl">{value}</p>
              <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Community feed */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-primary"><Flame className="mr-1 inline h-3 w-3" /> Fresh from the community</p>
              <h2 className="font-serif text-2xl md:text-3xl">What others just published</h2>
            </div>
            <Link to="/" className="text-sm text-muted-foreground hover:text-primary">Browse all <ArrowRight className="ml-1 inline h-3 w-3" /></Link>
          </div>

          {feed.length === 0 ? (
            <Card><CardContent className="p-10 text-center text-muted-foreground"><BookOpen className="mx-auto mb-2 h-8 w-8" />No published lessons yet — be the first.</CardContent></Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {feed.map((item) => (
                <Link key={item.id} to="/p/$slug" params={{ slug: item.slug }} className="group">
                  <article className="flex h-full gap-3 overflow-hidden rounded-xl border bg-card p-3 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
                    {item.cover_image_url ? (
                      <img src={item.cover_image_url} alt={item.title} loading="lazy" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
                    ) : (
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-primary/10"><BookOpen className="h-6 w-6 text-primary/60" /></div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap gap-1">
                        {item.tags.slice(0, 2).map((t) => <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>)}
                      </div>
                      <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">{item.title}</h3>
                      <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="truncate font-medium text-foreground/80">{item.author_name}</span>
                        <span>·</span>
                        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{item.read_time_minutes}m</span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* My published / drafts */}
        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-primary"><TrendingUp className="mr-1 inline h-3 w-3" /> Your work</p>
              <h2 className="font-serif text-2xl md:text-3xl">My lessons</h2>
            </div>
            <Link to="/my-lessons" className="text-sm text-muted-foreground hover:text-primary">All <ArrowRight className="ml-1 inline h-3 w-3" /></Link>
          </div>

          {mine.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <PenLine className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">You haven't written anything yet.</p>
                <Link to="/compose"><Button className="mt-4" size="sm">Start your first lesson</Button></Link>
              </CardContent>
            </Card>
          ) : (
            <ul className="divide-y rounded-xl border bg-card">
              {mine.map((p) => (
                <li key={p.id} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {p.published_at ? <Badge variant="secondary" className="text-[10px]">Published</Badge> : <Badge variant="outline" className="text-[10px]">Draft</Badge>}
                    </div>
                    <h4 className="mt-1 line-clamp-1 text-sm font-medium">{p.title}</h4>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {p.published_at && <Link to="/p/$slug" params={{ slug: p.slug }}><Button variant="ghost" size="sm">View</Button></Link>}
                    <Link to="/compose" search={{ id: p.id }}><Button variant="outline" size="sm">Edit</Button></Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
