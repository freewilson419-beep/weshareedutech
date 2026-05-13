import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { ArrowRight, BookOpen, Bookmark, CheckCircle2, Clock, PenLine } from "lucide-react";

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
  author?: { username: string; title: string; surname: string };
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "WeShare EduTeach — Learn by sharing" },
      { name: "description", content: "WeShare EduTeach lets participants read published lessons freely, then sign in to publish, comment, clap and bookmark lessons." },
    ],
  }),
  component: PublicationHome,
});

function PublicationHome() {
  const { session } = useAuth();
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: posts } = await supabase
        .from("posts")
        .select("id,slug,title,excerpt,cover_image_url,tags,read_time_minutes,published_at,author_user_id")
        .not("published_at", "is", null)
        .order("published_at", { ascending: false })
        .limit(30);

      if (!posts) {
        setLoading(false);
        return;
      }

      const authorIds = Array.from(new Set(posts.map((post) => post.author_user_id)));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id,username,title,surname")
        .in("user_id", authorIds);
      const byId = new Map(profiles?.map((profile) => [profile.user_id, profile]) ?? []);

      setItems(posts.map((post) => ({ ...post, author: byId.get(post.author_user_id) as FeedItem["author"] })));
      setLoading(false);
    })();
  }, []);

  const featured = items[0];
  const rest = items.slice(1);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background selection:bg-primary/10">
      <header className="container mx-auto flex h-20 items-center justify-between px-4 sm:px-8">
        <Link to="/" className="transition-opacity hover:opacity-80">
          <Logo className="h-8 w-auto text-primary" />
        </Link>
        <nav className="flex items-center gap-3 sm:gap-4">
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
            <>
              <Link to="/login">
                <Button variant="ghost" className="font-medium">Sign In</Button>
              </Link>
              <Link to="/signup">
                <Button className="font-medium px-5 sm:px-6">Get Started</Button>
              </Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="flex flex-col items-center justify-center px-4 pb-24 pt-16 sm:px-8 md:pb-32 md:pt-20">
          <div className="container mx-auto max-w-5xl text-center">
            <div className="mb-8 inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm text-primary">
              <span className="mr-2 flex h-2 w-2 rounded-full bg-primary" />
              Now open for every participant
            </div>

            <h1 className="mb-8 text-4xl font-extrabold leading-[1.1] tracking-normal text-foreground sm:text-5xl md:text-7xl">
              Learn by <span className="text-primary">sharing</span>.<br />
              Read what others publish.
            </h1>

            <p className="mx-auto mb-12 max-w-3xl text-xl leading-relaxed text-muted-foreground md:text-2xl">
              WeShare EduTeach is a digital learning publication where participants publish structured lessons for everyone to read freely. Sign in only when you want to publish, comment, clap, bookmark, or take an external quiz shared by the author.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              {session ? (
                <Link to="/compose">
                  <Button size="lg" className="h-14 w-full px-8 text-lg font-medium shadow-lg shadow-primary/20 sm:w-auto">
                    Publish a Lesson
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              ) : (
                <Link to="/signup">
                  <Button size="lg" className="h-14 w-full px-8 text-lg font-medium shadow-lg shadow-primary/20 sm:w-auto">
                    Create Free Account
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              )}
              <a href="#publications">
                <Button variant="outline" size="lg" className="h-14 w-full px-8 text-lg font-medium sm:w-auto">
                  Browse Lessons
                </Button>
              </a>
            </div>
          </div>

          <div className="container mx-auto mt-32 max-w-6xl px-4 sm:px-8">
            <div className="grid gap-8 md:grid-cols-3">
              <div className="rounded-2xl border bg-card p-8 shadow-sm">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="h-6 w-6" />
                </div>
                <h3 className="mb-3 text-xl font-bold">Structured Lessons</h3>
                <p className="leading-relaxed text-muted-foreground">
                  Lessons are arranged with clear titles, goals, explanations, reflections, and helpful resources so readers know exactly what they are learning.
                </p>
              </div>

              <div className="relative overflow-hidden rounded-2xl border bg-card p-8 shadow-sm">
                <div className="absolute right-0 top-0 p-8 opacity-5">
                  <PenLine className="h-32 w-32" />
                </div>
                <div className="relative z-10 mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <PenLine className="h-6 w-6" />
                </div>
                <h3 className="relative z-10 mb-3 text-xl font-bold">Publish Your Knowledge</h3>
                <p className="relative z-10 leading-relaxed text-muted-foreground">
                  Any signed-in participant can publish a lesson, add a quiz link from Google Forms, and make the lesson available on the public page.
                </p>
              </div>

              <div className="rounded-2xl border bg-card p-8 shadow-sm">
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="mb-3 text-xl font-bold">Engage and Save</h3>
                <p className="leading-relaxed text-muted-foreground">
                  Readers can sign in to clap for lessons, join the discussion, bookmark useful posts, and let publishers understand real engagement.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="publications" className="border-t bg-muted/30 py-16 md:py-20">
          <div className="container mx-auto px-4 sm:px-8">
            <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="mb-2 text-sm font-medium text-primary">Latest publications</p>
                <h2 className="text-3xl font-extrabold tracking-normal md:text-5xl">Read published lessons</h2>
                <p className="mt-4 max-w-2xl text-muted-foreground">
                  These lessons are open to everyone. Click any title to read the full lesson without logging in.
                </p>
              </div>
              {session && (
                <Link to="/compose">
                  <Button><PenLine className="h-4 w-4" /> Write a lesson</Button>
                </Link>
              )}
            </div>

            {loading ? (
              <div className="flex justify-center py-24"><div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" /></div>
            ) : items.length === 0 ? (
              <EmptyState signedIn={!!session} />
            ) : (
              <>
                {featured && <FeaturedCard item={featured} />}
                <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                  {rest.map((item) => <ArticleCard key={item.id} item={item} />)}
                </div>
              </>
            )}
          </div>
        </section>
      </main>

      <footer className="border-t bg-muted/30 py-12 text-center text-muted-foreground">
        <Logo className="mx-auto mb-4 h-6 w-auto text-muted-foreground/50" />
        <p className="text-sm">Share what you know. Learn what others share.</p>
      </footer>
    </div>
  );
}

function FeaturedCard({ item }: { item: FeedItem }) {
  return (
    <Link to="/p/$slug" params={{ slug: item.slug }} className="group block">
      <article className="grid gap-6 overflow-hidden rounded-2xl border bg-card shadow-sm md:grid-cols-2 md:gap-8">
        {item.cover_image_url ? (
          <div className="aspect-[16/9] overflow-hidden bg-muted md:aspect-auto">
            <img src={item.cover_image_url} alt={item.title} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
          </div>
        ) : (
          <div className="aspect-[16/9] bg-primary/10 md:aspect-auto" />
        )}
        <div className="flex flex-col justify-center p-8 md:p-10">
          <Badge className="mb-4 w-fit">Featured</Badge>
          <h3 className="text-3xl font-extrabold leading-tight tracking-normal md:text-5xl group-hover:text-primary">{item.title}</h3>
          <p className="mt-4 line-clamp-3 text-muted-foreground md:text-lg">{item.excerpt}</p>
          <Meta item={item} className="mt-6" />
        </div>
      </article>
    </Link>
  );
}

function ArticleCard({ item }: { item: FeedItem }) {
  return (
    <Link to="/p/$slug" params={{ slug: item.slug }} className="group block">
      <article className="h-full overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
        {item.cover_image_url ? (
          <div className="aspect-[16/9] overflow-hidden bg-muted sm:aspect-[16/10]">
            <img src={item.cover_image_url} alt={item.title} className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
          </div>
        ) : (
          <div className="aspect-[16/9] bg-primary/10 sm:aspect-[16/10]" />
        )}
        <div className="p-6">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {item.tags.slice(0, 2).map((tag) => <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>)}
          </div>
          <h3 className="text-xl font-bold leading-snug group-hover:text-primary">{item.title}</h3>
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.excerpt}</p>
          <Meta item={item} className="mt-4" />
        </div>
      </article>
    </Link>
  );
}

function Meta({ item, className }: { item: FeedItem; className?: string }) {
  const author = item.author;
  const name = author ? `${author.title ? author.title + " " : ""}${author.username || author.surname || "Anonymous"}` : "Anonymous";

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground ${className ?? ""}`}>
      <span className="font-medium text-foreground">{name}</span>
      <span>·</span>
      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {item.read_time_minutes} min read</span>
      <span>·</span>
      <span>{new Date(item.published_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
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
