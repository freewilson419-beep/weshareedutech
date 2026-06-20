import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { SiteFooter } from "@/components/site-footer";
import { ArrowRight, Bookmark, Eye, PenLine, BookOpen, Sparkles, Heart, MessageCircle, Share2, Search } from "lucide-react";
import { toast } from "sonner";

const GRADIENTS = [
  "from-fuchsia-500 via-pink-500 to-orange-400",
  "from-indigo-500 via-purple-500 to-pink-500",
  "from-emerald-400 via-teal-500 to-cyan-500",
  "from-amber-400 via-orange-500 to-rose-500",
  "from-sky-400 via-blue-500 to-indigo-600",
  "from-lime-400 via-green-500 to-emerald-600",
  "from-rose-400 via-red-500 to-purple-600",
  "from-yellow-300 via-amber-500 to-orange-600",
];
function gradientFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return GRADIENTS[hash % GRADIENTS.length];
}

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
  learn_to_teach: string | null;
  quiz_url: string | null;
  view_count?: number;
  like_count?: number;
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
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (authLoading || !session) return;
    const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    if (params?.get("stay") === "1") return;
    navigate({ to: "/dashboard", replace: true });
  }, [authLoading, session, navigate]);


  useEffect(() => {
    (async () => {
      const { data: posts } = await supabase
        .from("posts")
        .select("id,slug,title,excerpt,cover_image_url,tags,read_time_minutes,published_at,author_user_id,is_anonymous,learn_to_teach,quiz_url,view_count,like_count")
        .not("published_at", "is", null)
        .eq("is_unlisted", false)
        .order("published_at", { ascending: false })
        .limit(60);

      if (!posts || posts.length === 0) {
        setLoading(false);
        return;
      }

      const ordered = [...posts].sort((a, b) => ((b as any).like_count ?? 0) - ((a as any).like_count ?? 0));

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
        <section className="px-4 pb-4 pt-2 sm:px-8 sm:pb-6 sm:pt-4">
          <div className="container mx-auto max-w-5xl text-center">
            <h1 className="mb-2 text-xl font-bold leading-tight tracking-tight text-foreground sm:text-2xl md:text-3xl">
              Learn by <span className="text-primary">sharing</span>. Read what others publish.
            </h1>
            <p className="mx-auto mb-4 max-w-2xl text-xs leading-snug text-muted-foreground sm:text-sm">
              A digital learning publication. Sign in to publish, comment, like, or bookmark.
            </p>

            <div className="mx-auto max-w-2xl">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search lessons, topics, or tags…"
                  className="h-12 w-full rounded-full border border-input bg-card pl-12 pr-4 text-sm shadow-sm outline-none ring-primary/20 transition focus:ring-4 sm:h-14 sm:text-base"
                  aria-label="Search lessons"
                />
              </label>
            </div>
          </div>
        </section>

        <section id="publications" className="border-t bg-muted/30 py-6 sm:py-10">
          <div className="container mx-auto px-4 sm:px-8">
            {loading ? (
              <div className="flex justify-center py-16"><div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" /></div>
            ) : items.length === 0 ? (
              <EmptyState signedIn={!!session} />
            ) : (() => {
              const q = query.trim().toLowerCase();
              const filtered = q
                ? items.filter((it) =>
                    it.title.toLowerCase().includes(q) ||
                    (it.excerpt ?? "").toLowerCase().includes(q) ||
                    it.tags.some((t) => t.toLowerCase().includes(q))
                  )
                : items;
              if (filtered.length === 0) {
                return <p className="py-16 text-center text-sm text-muted-foreground">No lessons match “{query}”.</p>;
              }
              return (
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filtered.map((item) => <ArticleCard key={item.id} item={item} />)}
                </div>
              );
            })()}
          </div>
        </section>


        <section className="py-16 sm:py-24">
          <div className="container mx-auto max-w-6xl px-4 sm:px-8">
            <div className="mb-12 text-center sm:mb-16">
              <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-primary">Why join us</p>
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl md:text-5xl">Why WeShare EduTech</h2>
              <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
                Built for participants who want to learn deeply by teaching what they know.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="rounded-2xl border bg-card p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <BookOpen className="h-6 w-6" />
                </div>
                <h3 className="mb-3 text-xl font-bold">Structured Lessons</h3>
                <p className="text-base leading-relaxed text-muted-foreground">Clear titles, goals, explanations, reflections and resources — every lesson follows a thoughtful structure.</p>
              </div>
              <div className="rounded-2xl border bg-card p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="mb-3 text-xl font-bold">Publish Your Knowledge</h3>
                <p className="text-base leading-relaxed text-muted-foreground">Any signed-in participant can publish a lesson, attach media, and add a quiz link for readers.</p>
              </div>
              <div className="rounded-2xl border bg-card p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg">
                <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Heart className="h-6 w-6" />
                </div>
                <h3 className="mb-3 text-xl font-bold">Engage and Save</h3>
                <p className="text-base leading-relaxed text-muted-foreground">Like, discuss and bookmark lessons that matter to you — build your own reading library.</p>
              </div>
            </div>
            <div className="mt-10 text-center">
              <Link to="/about-platform" className="inline-flex items-center gap-1 text-base font-medium text-primary hover:underline">
                Learn more about this platform <ArrowRight className="h-4 w-4" />
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
  const lessonUrl = `/p/${item.slug}`;

  const onShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = typeof window !== "undefined" ? `${window.location.origin}${lessonUrl}` : lessonUrl;
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: item.title, text: item.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied");
      }
    } catch {
      /* user cancelled */
    }
  };

  const gradient = gradientFor(item.id);

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl bg-card transition hover:-translate-y-0.5">
      <Link to="/p/$slug" params={{ slug: item.slug }} className="group block">
        <div className={`relative aspect-video w-full overflow-hidden rounded-xl bg-gradient-to-br ${gradient}`}>
          {item.cover_image_url ? (
            <img
              src={item.cover_image_url}
              alt={item.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center p-4 text-center">
              <span className="line-clamp-3 text-lg font-extrabold uppercase tracking-wide text-white drop-shadow-lg sm:text-xl">
                {item.title}
              </span>
            </div>
          )}
        </div>
        <h3 className="mt-3 line-clamp-2 px-1 text-[15px] font-bold leading-snug group-hover:text-primary">
          {item.title}
        </h3>
        <Meta item={item} className="mt-1 px-1" />
      </Link>

      <div className="mt-2 flex items-center gap-4 px-1 pt-2 text-xs">
        <Link to="/p/$slug" params={{ slug: item.slug }} hash="comments" className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
          <MessageCircle className="h-3.5 w-3.5" /> Comment
        </Link>
        <button type="button" onClick={onShare} className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
          <Share2 className="h-3.5 w-3.5" /> Share
        </button>
      </div>
    </article>
  );
}


function Meta({ item, className }: { item: FeedItem; className?: string }) {
  const author = item.author;
  // Username-only (no titles)
  const name = item.is_anonymous
    ? "Anonymous"
    : author ? (author.username || author.surname || "Anonymous") : "Anonymous";

  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground ${className ?? ""}`}>
      <span className="font-medium text-foreground">{name}</span>
      <span>·</span>
      <span>{new Date(item.published_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
      <span>·</span>
      <span className="inline-flex items-center gap-1"><Eye className="h-3 w-3" /> {(item.view_count ?? 0).toLocaleString()}</span>
      <span>·</span>
      <span className="inline-flex items-center gap-1"><Heart className="h-3 w-3" /> {(item.like_count ?? 0).toLocaleString()}</span>
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
