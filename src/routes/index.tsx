import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";
import { ArrowRight, Bookmark, Clock, PenLine, BookOpen, Sparkles, Heart } from "lucide-react";

interface FeedItem {
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
  author?: { username: string; title: string; surname: string };
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WeShare EduTech — Learn by sharing" },
      { name: "description", content: "A community learning publication where participants publish structured lessons that everyone can read freely. Sign in to publish, comment, like, and bookmark." },
      { property: "og:title", content: "WeShare EduTech — Learn by sharing" },
      { property: "og:description", content: "A community learning publication where participants publish structured lessons that everyone can read freely." },
      { property: "og:url", content: "https://weshareeduteach.name.ng/" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://weshareeduteach.name.ng/" }],
  }),
  component: PublicationHome,
});

function PublicationHome() {
  const { session, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && session) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [authLoading, session, navigate]);

  useEffect(() => {
    (async () => {
      const { data: posts } = await supabase
        .from("posts")
        .select("id,slug,title,excerpt,cover_image_url,tags,read_time_minutes,published_at,author_user_id,is_anonymous")
        .not("published_at", "is", null)
        .eq("is_unlisted", false)
        .order("published_at", { ascending: false })
        .limit(60);

      if (!posts || posts.length === 0) {
        setLoading(false);
        return;
      }

      const ids = posts.map((p) => p.id);
      const { data: claps } = await supabase
        .from("claps")
        .select("post_id")
        .in("post_id", ids);

      const counts = new Map<string, number>();
      (claps ?? []).forEach((c: { post_id: string }) => {
        counts.set(c.post_id, (counts.get(c.post_id) ?? 0) + 1);
      });

      const ordered = [...posts].sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0));

      const authorIds = Array.from(new Set(ordered.map((post) => post.author_user_id)));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id,username,title,surname")
        .in("user_id", authorIds);
      const byId = new Map(profiles?.map((profile) => [profile.user_id, profile]) ?? []);

      setItems(ordered.map((post) => ({ ...post, author: byId.get(post.author_user_id) as FeedItem["author"] })));
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background selection:bg-primary/10">
      <header className="container mx-auto flex h-16 items-center justify-between px-4 sm:h-20 sm:px-8">
        <Link to="/" className="transition-opacity hover:opacity-80">
          <Logo className="h-7 w-auto text-primary sm:h-8" />
        </Link>
        <nav className="flex items-center gap-2">
          {session ? (
            <>
              <Link to="/compose">
                <Button variant="ghost" className="font-medium"><PenLine className="h-4 w-4" /> Write</Button>
              </Link>
              <Link to="/dashboard">
                <Button className="font-medium px-5">My space</Button>
              </Link>
            </>
          ) : (
            <Link to="/login">
              <Button variant="ghost" className="font-medium">Sign In</Button>
            </Link>
          )}
        </nav>
      </header>

      <main>
        <section className="px-4 pb-10 pt-6 sm:px-8 sm:pb-16 sm:pt-10">
          <div className="container mx-auto max-w-5xl text-center">
            <h1 className="mb-6 text-4xl font-extrabold leading-[1.1] tracking-normal text-foreground sm:text-5xl md:text-7xl">
              Learn by <span className="text-primary">sharing</span>.<br />
              Read what others publish.
            </h1>

            <p className="mx-auto mb-8 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-xl md:text-2xl">
              WeShare EduTech is a digital learning publication where participants publish structured lessons for everyone to read freely. Sign in to publish, comment, like, or bookmark.
            </p>

            <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              {session ? (
                <Link to="/compose">
                  <Button size="lg" className="h-12 w-full px-8 font-medium sm:h-14 sm:w-auto sm:text-lg">
                    Publish a Lesson
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <Link to="/signup">
                  <Button size="lg" className="h-12 w-full px-8 font-medium shadow-lg shadow-primary/20 sm:h-14 sm:w-auto sm:text-lg">
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              )}
              <a href="#publications" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="h-12 w-full px-8 font-medium sm:h-14 sm:w-auto sm:text-lg">
                  Browse Lessons
                </Button>
              </a>
            </div>
          </div>
        </section>

        <section id="publications" className="border-t bg-muted/30 py-12 sm:py-16">
          <div className="container mx-auto px-4 sm:px-8">
            <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="mb-1 text-sm font-medium text-primary">Top 5 popular</p>
                <h2 className="text-2xl font-extrabold tracking-normal sm:text-3xl md:text-4xl">Read published lessons</h2>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                  The most-liked lessons from our community. Tap any title to read the full lesson.
                </p>
              </div>
              {session && (
                <Link to="/compose">
                  <Button><PenLine className="h-4 w-4" /> Write a lesson</Button>
                </Link>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" /></div>
            ) : items.length === 0 ? (
              <EmptyState signedIn={!!session} />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                {items.map((item) => <ArticleCard key={item.id} item={item} />)}
              </div>
            )}
          </div>
        </section>

        <section className="py-12 sm:py-16">
          <div className="container mx-auto max-w-5xl px-4 sm:px-8">
            <h2 className="mb-8 text-center text-2xl font-extrabold sm:text-3xl">Why WeShare EduTech</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border bg-card p-6 shadow-sm">
                <h3 className="mb-2 text-lg font-bold">Structured Lessons</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">Clear titles, goals, explanations, reflections and resources.</p>
              </div>
              <div className="rounded-2xl border bg-card p-6 shadow-sm">
                <h3 className="mb-2 text-lg font-bold">Publish Your Knowledge</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">Any signed-in participant can publish a lesson and add a quiz link.</p>
              </div>
              <div className="rounded-2xl border bg-card p-6 shadow-sm">
                <h3 className="mb-2 text-lg font-bold">Engage and Save</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">Like, discuss and bookmark lessons that matter to you.</p>
              </div>
            </div>
            <div className="mt-8 text-center">
              <Link to="/about-platform" className="text-sm font-medium text-primary hover:underline">
                Learn more about this platform →
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}

function ArticleCard({ item }: { item: FeedItem }) {
  return (
    <Link to="/p/$slug" params={{ slug: item.slug }} className="group block">
      <article className="flex h-full gap-3 overflow-hidden rounded-lg border bg-card p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:flex-col sm:gap-0 sm:p-0">
        {item.cover_image_url ? (
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted sm:h-auto sm:w-full sm:rounded-none">
            <img src={item.cover_image_url} alt={item.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-[1.02] sm:aspect-[16/10]" />
          </div>
        ) : (
          <div className="h-20 w-20 shrink-0 rounded-md bg-primary/10 sm:h-auto sm:w-full sm:rounded-none sm:aspect-[16/10]" />
        )}
        <div className="min-w-0 flex-1 sm:p-4">
          <div className="mb-1.5 flex flex-wrap gap-1 sm:mb-2">
            {item.tags.slice(0, 2).map((tag) => <Badge key={tag} variant="secondary" className="text-[10px]">{tag}</Badge>)}
          </div>
          <h3 className="line-clamp-2 text-sm font-bold leading-snug group-hover:text-primary sm:text-base">{item.title}</h3>
          <p className="mt-1 line-clamp-2 hidden text-xs text-muted-foreground sm:block">{item.excerpt}</p>
          <Meta item={item} className="mt-2" />
        </div>
      </article>
    </Link>
  );
}

function Meta({ item, className }: { item: FeedItem; className?: string }) {
  const author = item.author;
  const name = item.is_anonymous
    ? "Anonymous"
    : author ? `${author.title ? author.title + " " : ""}${author.username || author.surname || "Anonymous"}` : "Anonymous";

  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground ${className ?? ""}`}>
      <span className="font-medium text-foreground">{name}</span>
      <span>·</span>
      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {item.read_time_minutes}m</span>
      <span>·</span>
      <span>{new Date(item.published_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
    </div>
  );
}

function EmptyState({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="mx-auto max-w-xl rounded-2xl border border-dashed bg-card px-8 py-16 text-center shadow-sm">
      <Bookmark className="mx-auto h-10 w-10 text-muted-foreground" />
      <h3 className="mt-4 text-2xl font-bold">No lessons published yet</h3>
      <p className="mt-2 text-sm text-muted-foreground">Be the first to publish. Your lesson will live here for everyone to read.</p>
      <div className="mt-6">
        {signedIn ? (
          <Link to="/compose"><Button>Write the first lesson</Button></Link>
        ) : (
          <Link to="/signup"><Button>Create an account to publish</Button></Link>
        )}
      </div>
    </div>
  );
}
