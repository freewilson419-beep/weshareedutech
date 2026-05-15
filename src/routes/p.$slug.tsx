import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { GraduationCap, Clock, ArrowLeft, ExternalLink, Bookmark, Send } from "lucide-react";
import { toast } from "sonner";
import { MediaRender, type MediaItem } from "@/components/media-manager";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authorName, initialsFor } from "@/lib/author-display";
import { ReportLessonButton } from "@/components/report-lesson-button";
import { SiteFooter } from "@/components/site-footer";

interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_image_url: string;
  tags: string[];
  read_time_minutes: number;
  published_at: string;
  goal: string;
  intro_slide: string;
  body_slide: string;
  conclusion_slide: string;
  reflection: string;
  learn_to_teach: string;
  quiz_url: string;
  author_user_id: string;
  is_anonymous?: boolean;
  section_media?: Record<string, MediaItem[]>;
}

interface Author { user_id: string; username: string; title: string; surname: string; affiliation: string; department: string; avatar_url: string }
interface Comment { id: string; body: string; created_at: string; author_user_id: string; author?: Author }

export const Route = createFileRoute("/p/$slug")({
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("posts")
      .select("title,excerpt,cover_image_url,published_at")
      .eq("slug", params.slug)
      .maybeSingle();
    return { seo: data };
  },
  head: ({ params, loaderData }) => {
    const url = `https://weshareeduteach.name.ng/p/${params.slug}`;
    const title = loaderData?.seo?.title
      ? `${loaderData.seo.title} — WeShare EduTech`
      : "Lesson — WeShare EduTech";
    const description =
      loaderData?.seo?.excerpt ||
      "Read this lesson on WeShare EduTech, a community publication of structured lessons.";
    const image = loaderData?.seo?.cover_image_url;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:type", content: "article" },
    ];
    if (image) {
      meta.push({ property: "og:image", content: image });
      meta.push({ name: "twitter:image", content: image });
      meta.push({ name: "twitter:card", content: "summary_large_image" });
    }
    const scripts = loaderData?.seo
      ? [
          {
            type: "application/ld+json",
            children: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Article",
              headline: loaderData.seo.title,
              description: loaderData.seo.excerpt || undefined,
              image: image || undefined,
              datePublished: loaderData.seo.published_at || undefined,
              url,
            }),
          },
        ]
      : [];
    return {
      meta,
      links: [{ rel: "canonical", href: url }],
      scripts,
    };
  },
  component: ArticleView,
});

function ArticleView() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [author, setAuthor] = useState<Author | null>(null);
  const [loading, setLoading] = useState(true);
  const [claps, setClaps] = useState(0);
  const [myClaps, setMyClaps] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("posts").select("*").eq("slug", slug).maybeSingle();
      if (!p) {
        setLoading(false);
        return;
      }
      setPost(p as unknown as Post);

      // record view
      supabase.from("lesson_views").insert({
        post_id: p.id,
        viewer_user_id: user?.id ?? null,
        referrer: typeof document !== "undefined" ? document.referrer : "",
      });

      const [{ data: a }, { data: clapRows }, { data: cmts }] = await Promise.all([
        supabase.from("profiles").select("user_id,username,title,surname,affiliation,department,avatar_url").eq("user_id", p.author_user_id).maybeSingle(),
        supabase.from("claps").select("count,user_id").eq("post_id", p.id),
        supabase.from("comments").select("id,body,created_at,author_user_id").eq("post_id", p.id).order("created_at", { ascending: true }),
      ]);
      setAuthor(a as Author | null);
      const total = (clapRows ?? []).reduce((s, r) => s + (r.count || 0), 0);
      setClaps(total);
      if (user) setMyClaps((clapRows ?? []).find((r) => r.user_id === user.id)?.count ?? 0);

      if (cmts?.length) {
        const ids = Array.from(new Set(cmts.map((c) => c.author_user_id)));
        const { data: cprof } = await supabase.from("profiles").select("user_id,username,title,surname,affiliation,department,avatar_url").in("user_id", ids);
        const byId = new Map(cprof?.map((x) => [x.user_id, x]) ?? []);
        setComments(cmts.map((c) => ({ ...c, author: byId.get(c.author_user_id) as Author })));
      }

      if (user) {
        const { data: bm } = await supabase.from("bookmarks").select("id").eq("post_id", p.id).eq("user_id", user.id).maybeSingle();
        setBookmarked(!!bm);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, user?.id]);

  // Track reading progress (signed-in users only)
  useEffect(() => {
    if (!post || !user) return;
    let last = 0;
    const onScroll = () => {
      const scrolled = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const pct = max > 0 ? Math.min(100, Math.round((scrolled / max) * 100)) : 0;
      if (pct > last + 5 || pct === 100) {
        last = pct;
        supabase.from("reading_progress").upsert(
          { user_id: user.id, post_id: post.id, progress_pct: pct, updated_at: new Date().toISOString() },
          { onConflict: "user_id,post_id" }
        );
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [post, user]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" /></div>;
  }
  if (!post) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 text-center px-4">
        <h1 className="font-serif text-3xl">Lesson not found</h1>
        <Link to="/"><Button variant="outline"><ArrowLeft className="h-4 w-4" /> Back to publication</Button></Link>
      </div>
    );
  }

  const isAnon = !!post.is_anonymous;
  const aName = authorName(author, isAnon);

  const clap = async () => {
    if (!user) return toast.error("Sign in to clap");
    if (myClaps >= 50) return;
    const next = myClaps + 1;
    setMyClaps(next);
    setClaps((c) => c + 1);
    await supabase.from("claps").upsert({ user_id: user.id, post_id: post.id, count: next, updated_at: new Date().toISOString() }, { onConflict: "user_id,post_id" });
  };

  const toggleBookmark = async () => {
    if (!user) return toast.error("Sign in to bookmark");
    if (bookmarked) {
      await supabase.from("bookmarks").delete().eq("post_id", post.id).eq("user_id", user.id);
      setBookmarked(false);
    } else {
      await supabase.from("bookmarks").insert({ post_id: post.id, user_id: user.id });
      setBookmarked(true);
    }
  };

  const postComment = async () => {
    if (!user) return toast.error("Sign in to comment");
    if (!newComment.trim()) return;
    setPosting(true);
    const { data, error } = await supabase
      .from("comments")
      .insert({ post_id: post.id, author_user_id: user.id, body: newComment.trim() })
      .select("id,body,created_at,author_user_id")
      .single();
    if (error) toast.error(error.message);
    else if (data) {
      const { data: prof } = await supabase.from("profiles").select("user_id,username,title,surname,affiliation,department").eq("user_id", user.id).maybeSingle();
      setComments((cs) => [...cs, { ...data, author: prof as Author }]);
      setNewComment("");
    }
    setPosting(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-serif text-xl font-semibold">
            <GraduationCap className="h-6 w-6 text-primary" /> WeShare EduTech
          </Link>
          <Link to="/"><Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /> All lessons</Button></Link>
        </div>
      </header>

      <article className="container mx-auto max-w-3xl px-4 py-12">
        <div className="text-center">
          <div className="flex flex-wrap justify-center gap-1.5">
            {post.tags.map((t) => <Badge key={t} variant="secondary" className="text-[10px] uppercase tracking-wider">{t}</Badge>)}
          </div>
          <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight md:text-6xl">{post.title}</h1>
          {post.excerpt && <p className="mx-auto mt-6 max-w-2xl font-serif text-lg italic text-muted-foreground md:text-xl">{post.excerpt}</p>}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <Avatar className="h-8 w-8">
              <AvatarImage src={isAnon ? undefined : author?.avatar_url || undefined} alt={aName} />
              <AvatarFallback className="bg-primary/10 text-xs text-primary">{initialsFor(aName)}</AvatarFallback>
            </Avatar>
            <span className="font-medium text-foreground">{aName}</span>
            {!isAnon && author?.affiliation && <span>· {author.affiliation}</span>}
            <span>·</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {post.read_time_minutes} min read</span>
            <span>·</span>
            <span>{new Date(post.published_at).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}</span>
          </div>
        </div>

        {post.cover_image_url && (
          <img src={post.cover_image_url} alt="" className="mt-8 aspect-[16/9] w-full rounded-md object-cover sm:mt-10" />
        )}

        <div className="prose-article mt-12 space-y-12 text-[1.075rem] leading-relaxed">
          <Section label="Goal" body={post.goal} />
          <Section label="Introduction" body={post.intro_slide} media={post.section_media?.intro} />
          <Section label="Body" body={post.body_slide} media={post.section_media?.body} />
          <Section label="Conclusion" body={post.conclusion_slide} media={post.section_media?.conclusion} />
          <Section label="Reflection" body={post.reflection} media={post.section_media?.reflection} />
          <Section label="Learn to teach" body={post.learn_to_teach} media={post.section_media?.learn_to_teach} />
        </div>

        {post.quiz_url && (
          <div className="mt-12 rounded-lg border bg-card p-6 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">External quiz</p>
            <h3 className="mt-2 font-serif text-2xl">Test your understanding</h3>
            <p className="mt-2 text-sm text-muted-foreground">The author has attached an external quiz for this lesson.</p>
            <a href={post.quiz_url} target="_blank" rel="noreferrer" className="mt-4 inline-flex">
              <Button>Take the quiz <ExternalLink className="h-4 w-4" /></Button>
            </a>
          </div>
        )}

        {/* Engagement bar */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3 border-y py-4">
          <Button variant={myClaps > 0 ? "default" : "outline"} onClick={clap}>
            👏 {claps} {myClaps > 0 && <span className="ml-1 text-xs opacity-80">(+{myClaps})</span>}
          </Button>
          <Button variant={bookmarked ? "default" : "outline"} onClick={toggleBookmark}>
            <Bookmark className="h-4 w-4" /> {bookmarked ? "Saved" : "Save"}
          </Button>
          <ReportLessonButton postId={post.id} />
        </div>

        {/* Comments */}
        <section className="mt-12">
          <h3 className="font-serif text-2xl">Discussion ({comments.length})</h3>
          {user ? (
            <div className="mt-4 space-y-2">
              <Textarea value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Share your thoughts…" rows={3} />
              <Button onClick={postComment} disabled={posting || !newComment.trim()}><Send className="h-4 w-4" /> Post</Button>
            </div>
          ) : (
            <p className="mt-4 rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
              <Link to="/login" className="font-medium text-primary underline">Sign in</Link> to join the discussion.
            </p>
          )}
          <ul className="mt-8 space-y-6">
            {comments.map((c) => {
              const cn = authorName(c.author, false);
              return (
                <li key={c.id} className="border-b pb-6">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={c.author?.avatar_url || undefined} alt={cn} />
                      <AvatarFallback className="bg-primary/10 text-xs text-primary">{initialsFor(cn)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{cn}</p>
                      <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-sm">{c.body}</p>
                </li>
              );
            })}
          </ul>
        </section>
      </article>
      <SiteFooter />
    </div>
  );
}

function Section({ label, body, media }: { label: string; body: string; media?: MediaItem[] }) {
  const hasBody = !!body?.trim();
  const hasMedia = !!media?.length;
  if (!hasBody && !hasMedia) return null;
  return (
    <section>
      <h2 className="font-serif text-2xl text-primary">{label}</h2>
      {hasBody && <div className="mt-3 whitespace-pre-wrap">{body}</div>}
      {hasMedia && <MediaRender items={media!} />}
    </section>
  );
}
