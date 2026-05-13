import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GraduationCap, Clock, BookOpenText, PenLine } from "lucide-react";

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
  author?: { username: string; title: string; surname: string; affiliation: string };
}

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EduTeach — A publication for participants" },
      { name: "description", content: "A growing collection of structured lessons published by the community. Read freely. Sign in to publish your own." },
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
      const authorIds = Array.from(new Set(posts.map((p) => p.author_user_id)));
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id,username,title,surname,affiliation")
        .in("user_id", authorIds);
      const byId = new Map(profiles?.map((p) => [p.user_id, p]) ?? []);
      setItems(
        posts.map((p) => ({
          ...p,
          author: byId.get(p.author_user_id) as FeedItem["author"],
        })),
      );
      setLoading(false);
    })();
  }, []);

  const featured = items[0];
  const rest = items.slice(1);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-serif text-xl font-semibold">
            <GraduationCap className="h-6 w-6 text-primary" />
            EduTeach
          </Link>
          <nav className="flex items-center gap-2">
            {session ? (
              <>
                <Link to="/compose"><Button variant="ghost"><PenLine className="h-4 w-4" /> Write</Button></Link>
                <Link to="/dashboard"><Button>My space</Button></Link>
              </>
            ) : (
              <>
                <Link to="/login"><Button variant="ghost">Sign in</Button></Link>
                <Link to="/signup"><Button>Get started</Button></Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Masthead */}
      <section className="border-b bg-secondary/40">
        <div className="container mx-auto px-4 py-12 md:py-20 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Volume I · A community publication</p>
          <h1 className="mt-4 font-serif text-5xl font-semibold tracking-tight md:text-7xl">
            EduTeach
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
            Structured lessons, written by participants, for anyone who wants to learn deeper.
          </p>
        </div>
      </section>

      {/* Feed */}
      <main className="container mx-auto px-4 py-12">
        {loading ? (
          <div className="flex justify-center py-24"><div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" /></div>
        ) : items.length === 0 ? (
          <EmptyState signedIn={!!session} />
        ) : (
          <>
            {featured && <FeaturedCard item={featured} />}
            <div className="mt-16 grid grid-cols-1 gap-x-10 gap-y-12 md:grid-cols-2 lg:grid-cols-3">
              {rest.map((item) => (
                <ArticleCard key={item.id} item={item} />
              ))}
            </div>
          </>
        )}
      </main>

      <footer className="border-t py-10 text-center text-sm text-muted-foreground">
        <p className="font-serif italic">"To teach is to learn twice."</p>
        <p className="mt-2">© {new Date().getFullYear()} EduTeach</p>
      </footer>
    </div>
  );
}

function FeaturedCard({ item }: { item: FeedItem }) {
  return (
    <Link to="/p/$slug" params={{ slug: item.slug }} className="group block">
      <article className="grid grid-cols-1 gap-8 border-b pb-12 md:grid-cols-2 md:gap-12">
        {item.cover_image_url ? (
          <div className="aspect-[4/3] overflow-hidden rounded-md bg-muted">
            <img src={item.cover_image_url} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
          </div>
        ) : (
          <div className="aspect-[4/3] rounded-md bg-gradient-to-br from-primary/10 via-accent to-secondary" />
        )}
        <div className="flex flex-col justify-center">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Featured</p>
          <h2 className="mt-3 font-serif text-3xl font-semibold leading-tight md:text-5xl">
            {item.title}
          </h2>
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
      <article>
        {item.cover_image_url ? (
          <div className="aspect-[16/10] overflow-hidden rounded-md bg-muted">
            <img src={item.cover_image_url} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
          </div>
        ) : (
          <div className="aspect-[16/10] rounded-md bg-gradient-to-br from-primary/10 via-accent to-secondary" />
        )}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {item.tags.slice(0, 2).map((t) => (
            <Badge key={t} variant="secondary" className="text-[10px] uppercase tracking-wider">{t}</Badge>
          ))}
        </div>
        <h3 className="mt-2 font-serif text-2xl font-semibold leading-snug group-hover:text-primary">{item.title}</h3>
        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{item.excerpt}</p>
        <Meta item={item} className="mt-4" />
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
      {author?.affiliation && <span>· {author.affiliation}</span>}
      <span>·</span>
      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {item.read_time_minutes} min read</span>
      <span>·</span>
      <span>{new Date(item.published_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
    </div>
  );
}

function EmptyState({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="mx-auto max-w-xl rounded-lg border border-dashed bg-card px-8 py-16 text-center">
      <BookOpenText className="mx-auto h-10 w-10 text-muted-foreground" />
      <h3 className="mt-4 font-serif text-2xl">No lessons published yet</h3>
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
