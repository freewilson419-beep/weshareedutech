import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  PenLine,
  Eye,
  BookmarkIcon,
  FileText,
  Sparkles,
  Flame,
  ArrowRight,
  BookOpen,
  TrendingUp,
  History,
  Trophy,
  Settings,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { authorName, initialsFor } from "@/lib/author-display";
import { MyGrades } from "@/components/my-grades";

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
  is_anonymous: boolean;
  author_label?: string;
  author_avatar?: string;
}

interface MyPost {
  id: string;
  slug: string;
  title: string;
  published_at: string | null;
  updated_at: string;
}

interface Resume {
  slug: string;
  title: string;
  cover: string;
  pct: number;
}

interface TopLesson {
  slug: string;
  title: string;
  views: number;
}

function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ published: 0, drafts: 0, views: 0, bookmarks: 0 });
  const [feed, setFeed] = useState<Feed[]>([]);
  const [trending, setTrending] = useState<Feed[]>([]);
  const [mine, setMine] = useState<MyPost[]>([]);
  const [resume, setResume] = useState<Resume | null>(null);
  const [top, setTop] = useState<TopLesson | null>(null);
  const [greeting, setGreeting] = useState("Welcome");
  const [name, setName] = useState("");

  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening");
  }, []);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ count: published }, { count: drafts }, { data: posts }, { count: bookmarks }, { data: profile }] =
        await Promise.all([
          supabase
            .from("posts")
            .select("id", { count: "exact", head: true })
            .eq("author_user_id", user.id)
            .not("published_at", "is", null),
          supabase
            .from("posts")
            .select("id", { count: "exact", head: true })
            .eq("author_user_id", user.id)
            .is("published_at", null),
          supabase
            .from("posts")
            .select("id,slug,title,published_at,updated_at")
            .eq("author_user_id", user.id)
            .order("updated_at", { ascending: false })
            .limit(50),
          supabase.from("bookmarks").select("id", { count: "exact", head: true }).eq("user_id", user.id),
          supabase.from("profiles").select("username,surname,title").eq("user_id", user.id).maybeSingle(),
        ]);

      let views = 0;
      if (posts?.length) {
        // Per-post head counts so we're not capped by the 1000-row default
        const perPost = await Promise.all(
          posts.map(async (p) => {
            const { count } = await supabase
              .from("lesson_views")
              .select("id", { count: "exact", head: true })
              .eq("post_id", p.id);
            return { post: p, count: count ?? 0 };
          }),
        );
        views = perPost.reduce((sum, r) => sum + r.count, 0);
        const best = perPost.reduce((a, b) => (b.count > a.count ? b : a), perPost[0]);
        if (best && best.count > 0) setTop({ slug: best.post.slug, title: best.post.title, views: best.count });
      }
      setStats({ published: published ?? 0, drafts: drafts ?? 0, views, bookmarks: bookmarks ?? 0 });
      setMine((posts ?? []).slice(0, 5) as MyPost[]);
      if (profile) setName(profile.username || profile.surname || "");

      // Continue reading — most recent unfinished
      const { data: rp } = await supabase
        .from("reading_progress")
        .select("progress_pct,post_id,updated_at")
        .eq("user_id", user.id)
        .lt("progress_pct", 95)
        .order("updated_at", { ascending: false })
        .limit(1);
      if (rp?.[0]) {
        const { data: rPost } = await supabase
          .from("posts")
          .select("slug,title,cover_image_url")
          .eq("id", rp[0].post_id)
          .maybeSingle();
        if (rPost)
          setResume({ slug: rPost.slug, title: rPost.title, cover: rPost.cover_image_url, pct: rp[0].progress_pct });
      }

      // Community feed (latest)
      const { data: latest } = await supabase
        .from("posts")
        .select("id,slug,title,excerpt,cover_image_url,tags,read_time_minutes,published_at,author_user_id,is_anonymous")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(3);

      const decorate = async (rows: typeof latest): Promise<Feed[]> => {
        if (!rows?.length) return [];
        const ids = Array.from(new Set(rows.filter((r) => !r.is_anonymous).map((r) => r.author_user_id)));
        const { data: profs } = ids.length
          ? await supabase.from("profiles").select("user_id,username,title,surname,avatar_url").in("user_id", ids)
          : { data: [] as any[] };
        const map = new Map(profs?.map((p) => [p.user_id, p]) ?? []);
        return rows.map((p) => {
          const a = !p.is_anonymous ? map.get(p.author_user_id) : null;
          return {
            ...p,
            author_label: authorName(a as any, p.is_anonymous),
            author_avatar: !p.is_anonymous ? ((a as any)?.avatar_url ?? "") : "",
          };
        });
      };

      setFeed(await decorate(latest));

      // Trending — last 7 days (single server-side aggregation via RPC)
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data: trendingRows } = await supabase.rpc("trending_post_ids", { _since: since, _limit: 4 });
      const topIds = (trendingRows ?? []).map((r: any) => r.post_id as string);
      if (topIds.length) {
        const { data: tRows } = await supabase
          .from("posts")
          .select(
            "id,slug,title,excerpt,cover_image_url,tags,read_time_minutes,published_at,author_user_id,is_anonymous",
          )
          .in("id", topIds)
          .not("published_at", "is", null);
        setTrending(await decorate(tRows));
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
              <Sparkles className="h-3 w-3" /> {greeting}
              {name ? `, ${name}` : ""}
            </div>
            <h1 className="font-serif text-3xl leading-tight md:text-5xl">
              Your stage to <span className="text-primary">Teach</span>,<br className="hidden md:block" /> your library
              to <span className="text-primary">Learn</span>.
            </h1>
            <p className="mt-3 text-muted-foreground md:text-lg">
              Pick up a draft, ship a new lesson, or dive into what the community just published.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/compose">
              <Button size="lg" className="shadow-lg shadow-primary/20">
                <PenLine className="h-4 w-4" /> Write a lesson
              </Button>
            </Link>
            <Link to="/settings/profile">
              <Button size="lg" variant="outline">
                <Settings className="h-4 w-4" /> Settings
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Continue reading + top lesson */}
      {(resume || top) && (
        <div className="grid gap-4 md:grid-cols-2">
          {resume && (
            <Card className="overflow-hidden">
              <Link to="/p/$slug" params={{ slug: resume.slug }} className="group block">
                <div className="flex items-stretch">
                  {resume.cover ? (
                    <img src={resume.cover} alt="" className="h-28 w-28 shrink-0 object-cover" />
                  ) : (
                    <div className="flex h-28 w-28 shrink-0 items-center justify-center bg-primary/10">
                      <History className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div className="flex flex-1 flex-col justify-between p-4">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wider text-primary">
                        <History className="mr-1 inline h-3 w-3" /> Continue reading
                      </p>
                      <h3 className="mt-1 line-clamp-2 font-serif text-base font-semibold group-hover:text-primary">
                        {resume.title}
                      </h3>
                    </div>
                    <div className="mt-2">
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full bg-primary" style={{ width: `${resume.pct}%` }} />
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">{resume.pct}% read</p>
                    </div>
                  </div>
                </div>
              </Link>
            </Card>
          )}
          {top && (
            <Card>
              <Link to="/p/$slug" params={{ slug: top.slug }} className="block p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-amber-600">
                  <Trophy className="mr-1 inline h-3 w-3" /> Your top lesson
                </p>
                <h3 className="mt-1 line-clamp-2 font-serif text-base font-semibold">{top.title}</h3>
                <div className="mt-3 flex items-baseline gap-2">
                  <span className="font-serif text-3xl">{top.views}</span>
                  <span className="text-sm text-muted-foreground">total reads</span>
                </div>
              </Link>
            </Card>
          )}
        </div>
      )}

      <MyGrades />

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

      {/* Search */}
      <section>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const q = (new FormData(e.currentTarget).get("q") as string)?.trim();
            if (q) window.location.href = `/?stay=1&q=${encodeURIComponent(q)}`;
            else window.location.href = `/?stay=1`;
          }}
          className="relative"
        >
          <input
            name="q"
            type="search"
            placeholder="Search lessons, topics, authors…"
            className="w-full rounded-full border bg-card py-3 pl-12 pr-4 text-sm shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <svg
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
          </svg>
        </form>
      </section>

      {/* For-you removed by request */}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Community feed */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-primary">
                <Flame className="mr-1 inline h-3 w-3" /> Fresh from the community
              </p>
              <h2 className="font-serif text-2xl md:text-3xl">Just published</h2>
            </div>
            <Link to="/" className="text-sm text-muted-foreground hover:text-primary">
              Browse all <ArrowRight className="ml-1 inline h-3 w-3" />
            </Link>
          </div>

          {feed.length === 0 ? (
            <Card>
              <CardContent className="p-10 text-center text-muted-foreground">
                <BookOpen className="mx-auto mb-2 h-8 w-8" />
                No published lessons yet — be the first.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {feed.map((item) => (
                <FeedCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>

        {/* My lessons */}
        <section className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-primary">
                <FileText className="mr-1 inline h-3 w-3" /> Your work
              </p>
              <h2 className="font-serif text-2xl md:text-3xl">My lessons</h2>
            </div>
            <Link to="/my-lessons" className="text-sm text-muted-foreground hover:text-primary">
              All <ArrowRight className="ml-1 inline h-3 w-3" />
            </Link>
          </div>

          {mine.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <PenLine className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">You haven't written anything yet.</p>
                <Link to="/compose">
                  <Button className="mt-4" size="sm">
                    Start your first lesson
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <ul className="divide-y rounded-xl border bg-card">
              {mine.map((p) => (
                <li key={p.id} className="flex items-center gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    {p.published_at ? (
                      <Badge variant="secondary" className="text-[10px]">
                        Published
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">
                        Draft
                      </Badge>
                    )}
                    <h4 className="mt-1 line-clamp-1 text-sm font-medium">{p.title}</h4>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {p.published_at && (
                      <Link to="/p/$slug" params={{ slug: p.slug }}>
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </Link>
                    )}
                    <Link to="/compose" search={{ id: p.id }}>
                      <Button variant="outline" size="sm">
                        Edit
                      </Button>
                    </Link>
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

function FeedCard({ item }: { item: Feed }) {
  // Show username only (strip title prefix like "Mr Dr.") and posted date — not read time.
  const handle =
    (item.author_label || "")
      .replace(/^(Dr\.?|Prof\.?|Mr\.?|Mrs\.?|Ms\.?)\s+/i, "")
      .replace(/^(Dr\.?|Prof\.?|Mr\.?|Mrs\.?|Ms\.?)\s+/i, "")
      .trim() || "Anonymous";
  const when = item.published_at ? formatDistanceToNow(new Date(item.published_at), { addSuffix: true }) : "";
  return (
    <Link to="/p/$slug" params={{ slug: item.slug }} className="group">
      <article className="flex h-full gap-3 overflow-hidden rounded-xl border bg-card p-3 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
        {item.cover_image_url ? (
          <img
            src={item.cover_image_url}
            alt={item.title}
            loading="lazy"
            className="h-20 w-20 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="h-6 w-6 text-primary/60" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap gap-1">
            {item.tags.slice(0, 2).map((t) => (
              <Badge key={t} variant="secondary" className="text-[10px]">
                {t}
              </Badge>
            ))}
          </div>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug group-hover:text-primary">{item.title}</h3>
          <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Avatar className="h-4 w-4">
              <AvatarImage src={item.author_avatar || undefined} alt={handle} />
              <AvatarFallback className="bg-primary/10 text-[8px] text-primary">{initialsFor(handle)}</AvatarFallback>
            </Avatar>
            <span className="truncate font-medium text-foreground/80">@{handle}</span>
            {when && (
              <>
                <span>·</span>
                <span className="truncate">{when}</span>
              </>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}
