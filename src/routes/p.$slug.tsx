import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { GraduationCap, ArrowLeft, ExternalLink, Bookmark, Send, Heart, Eye, MessageCircle, Download, ClipboardList, Shield, Reply } from "lucide-react";
import { toast } from "sonner";
import { MediaRender, type MediaItem } from "@/components/media-manager";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initialsFor } from "@/lib/author-display";
import { ReportLessonButton } from "@/components/report-lesson-button";
import { SiteFooter } from "@/components/site-footer";
import { VoiceRecorder } from "@/components/voice-recorder";
import { safeHref } from "@/lib/safe-url";

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
  download_url?: string;
  reflection_form_url?: string;
  view_count?: number;
  like_count?: number;
  author_user_id: string;
  is_anonymous?: boolean;
  section_media?: Record<string, MediaItem[]>;
}

interface Author { user_id: string; username: string; title: string; surname: string; affiliation: string; department: string; avatar_url: string }
interface Comment {
  id: string;
  body: string;
  created_at: string;
  author_user_id: string;
  parent_id?: string | null;
  author?: Author;
  likes: number;
  liked: boolean;
}

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

const COMMENT_LIMIT = 1000;

// Username-only (no "Dr." / "Prof." titles per platform rule)
function displayName(a: { username?: string | null; surname?: string | null } | null | undefined, isAnon?: boolean): string {
  if (isAnon) return "Anonymous contributor";
  if (!a) return "Anonymous";
  return a.username || a.surname || "Anonymous";
}

function ArticleView() {
  const { slug } = Route.useParams();
  const { user } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [author, setAuthor] = useState<Author | null>(null);
  const [loading, setLoading] = useState(true);
  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [views, setViews] = useState(0);
  const [bookmarked, setBookmarked] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [adminIds, setAdminIds] = useState<Set<string>>(new Set());
  const [newComment, setNewComment] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [posting, setPosting] = useState(false);
  const [hasSubmittedVoice, setHasSubmittedVoice] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: p } = await supabase.from("posts").select("*").eq("slug", slug).maybeSingle();
      if (!p) {
        setLoading(false);
        return;
      }
      const post = p as unknown as Post;
      setPost(post);
      setLikes(post.like_count ?? 0);
      setViews((post.view_count ?? 0) + 1); // optimistic: include this view

      // record view (fires trigger that bumps view_count)
      await supabase.from("lesson_views").insert({
        post_id: post.id,
        viewer_user_id: user?.id ?? null,
        referrer: typeof document !== "undefined" ? document.referrer : "",
      });

      const [{ data: a }, { data: clapRows }, { data: cmts }] = await Promise.all([
        supabase.from("profiles").select("user_id,username,title,surname,affiliation,department,avatar_url").eq("user_id", post.author_user_id).maybeSingle(),
        supabase.from("claps").select("user_id").eq("post_id", post.id),
        supabase.from("comments").select("id,body,created_at,author_user_id,parent_id").eq("post_id", post.id).order("created_at", { ascending: true }),
      ]);
      setAuthor(a as Author | null);
      if (user) setLiked(!!(clapRows ?? []).find((r) => r.user_id === user.id));

      if (cmts?.length) {
        const ids = Array.from(new Set(cmts.map((c) => c.author_user_id)));
        const cmtIds = cmts.map((c) => c.id);
        const [{ data: cprof }, { data: roles }, { data: cl }] = await Promise.all([
          supabase.from("profiles").select("user_id,username,title,surname,affiliation,department,avatar_url").in("user_id", ids),
          supabase.from("user_roles").select("user_id").eq("role", "admin").in("user_id", ids),
          supabase.from("comment_likes").select("comment_id,user_id").in("comment_id", cmtIds),
        ]);
        const byId = new Map(cprof?.map((x) => [x.user_id, x]) ?? []);
        setAdminIds(new Set((roles ?? []).map((r: any) => r.user_id)));
        const likeBy = new Map<string, { count: number; mine: boolean }>();
        (cl ?? []).forEach((l: any) => {
          const cur = likeBy.get(l.comment_id) ?? { count: 0, mine: false };
          cur.count++;
          if (user && l.user_id === user.id) cur.mine = true;
          likeBy.set(l.comment_id, cur);
        });
        setComments(cmts.map((c) => ({
          ...c,
          author: byId.get(c.author_user_id) as Author,
          likes: likeBy.get(c.id)?.count ?? 0,
          liked: likeBy.get(c.id)?.mine ?? false,
        })));
      }

      if (user) {
        const [{ data: bm }, { data: vs }] = await Promise.all([
          supabase.from("bookmarks").select("id").eq("post_id", post.id).eq("user_id", user.id).maybeSingle(),
          supabase.from("voice_submissions").select("id").eq("post_id", post.id).eq("student_user_id", user.id).limit(1).maybeSingle(),
        ]);
        setBookmarked(!!bm);
        setHasSubmittedVoice(!!vs);
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
  const aName = displayName(author, isAnon);

  const toggleLike = async () => {
    if (!user) return toast.error("Sign in to like");
    if (liked) {
      setLiked(false);
      setLikes((c) => Math.max(0, c - 1));
      await supabase.from("claps").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      setLiked(true);
      setLikes((c) => c + 1);
      await supabase.from("claps").upsert(
        { user_id: user.id, post_id: post.id, count: 1, updated_at: new Date().toISOString() },
        { onConflict: "user_id,post_id" }
      );
    }
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

  const submitComment = async (body: string, parentId: string | null) => {
    if (!user) return toast.error("Sign in to comment");
    const t = body.trim();
    if (!t) return;
    if (t.length > COMMENT_LIMIT) return toast.error(`Max ${COMMENT_LIMIT} characters`);
    setPosting(true);
    const { data, error } = await supabase
      .from("comments")
      .insert({ post_id: post.id, author_user_id: user.id, body: t, parent_id: parentId })
      .select("id,body,created_at,author_user_id,parent_id")
      .single();
    if (error) toast.error(error.message);
    else if (data) {
      const { data: prof } = await supabase.from("profiles").select("user_id,username,title,surname,affiliation,department,avatar_url").eq("user_id", user.id).maybeSingle();
      setComments((cs) => [...cs, { ...(data as any), author: prof as Author, likes: 0, liked: false }]);
      // check if current user is admin (one-time include)
      const { data: r } = await supabase.from("user_roles").select("user_id").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      if (r) setAdminIds((s) => new Set([...s, user.id]));
    }
    setPosting(false);
  };

  const toggleCommentLike = async (c: Comment) => {
    if (!user) return toast.error("Sign in to like");
    setComments((cs) => cs.map((x) => x.id === c.id ? { ...x, liked: !c.liked, likes: c.likes + (c.liked ? -1 : 1) } : x));
    if (c.liked) {
      await supabase.from("comment_likes").delete().eq("comment_id", c.id).eq("user_id", user.id);
    } else {
      await supabase.from("comment_likes").insert({ comment_id: c.id, user_id: user.id });
    }
  };

  const topComments = comments
    .filter((c) => !c.parent_id)
    .slice()
    .sort((a, b) => {
      const aMine = user && a.author_user_id === user.id ? 1 : 0;
      const bMine = user && b.author_user_id === user.id ? 1 : 0;
      if (aMine !== bMine) return bMine - aMine;
      return 0;
    });
  const repliesByParent = new Map<string, Comment[]>();
  comments.filter((c) => c.parent_id).forEach((c) => {
    const arr = repliesByParent.get(c.parent_id!) ?? [];
    arr.push(c);
    repliesByParent.set(c.parent_id!, arr);
  });
  // Within replies, also surface current user's replies first
  if (user) {
    repliesByParent.forEach((arr, k) => {
      arr.sort((a, b) => {
        const aMine = a.author_user_id === user.id ? 1 : 0;
        const bMine = b.author_user_id === user.id ? 1 : 0;
        return bMine - aMine;
      });
      repliesByParent.set(k, arr);
    });
  }

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
            <span>Posted {new Date(post.published_at).toLocaleString(undefined, { month: "long", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}</span>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {views.toLocaleString()} views</span>
            <span className="inline-flex items-center gap-1"><Heart className={`h-3.5 w-3.5 ${liked ? "fill-current text-primary" : ""}`} /> {likes.toLocaleString()} likes</span>
            <a href="#comments" className="inline-flex items-center gap-1 hover:text-primary"><MessageCircle className="h-3.5 w-3.5" /> {comments.length} comments</a>
          </div>
        </div>

        {post.cover_image_url && (
          <img src={post.cover_image_url} alt="" className="mt-8 aspect-[16/9] w-full rounded-md object-cover sm:mt-10" />
        )}

        {post.download_url && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 rounded-lg border bg-primary/5 p-4">
            <p className="text-sm text-muted-foreground">Want a copy to study offline?</p>
            <a href={safeHref(post.download_url)} target="_blank" rel="noreferrer">
              <Button><Download className="h-4 w-4" /> Download Learning Material</Button>
            </a>
          </div>
        )}

        <div className="prose-article mt-12 space-y-12 text-[1.075rem] leading-relaxed">
          <Section label="Goal" body={post.goal} />
          <Section label="Introduction" body={post.intro_slide} media={post.section_media?.intro} />
          <Section label="Body" body={post.body_slide} media={post.section_media?.body} />
          <Section label="Conclusion" body={post.conclusion_slide} media={post.section_media?.conclusion} />
          <Section id="reflection" label="Reflection" body={post.reflection} media={post.section_media?.reflection}>
            <p className="mt-3 text-sm italic text-muted-foreground">
              (Would you like to take a moment to reflect on what you have just read in order to benefit both you and society?)
            </p>
            {post.reflection_form_url && (
              <div className="mt-4">
                <a href={safeHref(post.reflection_form_url)} target="_blank" rel="noreferrer">
                  <Button variant="outline"><ClipboardList className="h-4 w-4" /> Open reflection form <ExternalLink className="h-3.5 w-3.5" /></Button>
                </a>
              </div>
            )}
          </Section>
          <Section id="learn-to-teach" label="Learn to teach" body={post.learn_to_teach} media={post.section_media?.learn_to_teach}>
            <p className="mt-3 text-sm italic text-muted-foreground">
              (Would you like this knowledge to strengthen your understanding, help others grow, and contribute positively to society, making it a lasting asset to both you and your community?)
            </p>
          </Section>
          <div id="voice-submission" className="scroll-mt-20"><VoiceRecorder postId={post.id} authorUserId={post.author_user_id} /></div>
        </div>

        {post.quiz_url && (
          <div id="external-quiz" className="mt-12 scroll-mt-20 rounded-lg border bg-card p-6 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">External quiz</p>
            <h3 className="mt-2 font-serif text-2xl">Test your understanding</h3>
            {!user ? (
              <>
                <p className="mt-2 text-sm text-muted-foreground">
                  Sign in first — quizzes are only available to members who've engaged with the lesson.
                </p>
                <Link to="/login" className="mt-4 inline-flex">
                  <Button variant="outline">Sign in to take the quiz</Button>
                </Link>
              </>
            ) : hasSubmittedVoice ? (
              <>
                <p className="mt-2 text-sm text-muted-foreground">
                  Nice work — your Learn-to-Teach voice note is in. You're cleared to take the exam.
                </p>
                <a href={safeHref(post.quiz_url)} target="_blank" rel="noreferrer" className="mt-4 inline-flex">
                  <Button>Take the quiz <ExternalLink className="h-4 w-4" /></Button>
                </a>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-muted-foreground">
                  The exam unlocks once you've submitted your Learn-to-Teach voice recording above.
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    toast.info("Please record and submit your Learn-to-Teach voice note first.");
                    document.getElementById("voice-submission")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  Go to Learn-to-Teach
                </Button>
              </>
            )}
          </div>
        )}

        {/* Engagement bar */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3 border-y py-4">
          <Button variant={liked ? "default" : "outline"} onClick={toggleLike} disabled={!user} title={!user ? "Sign in to like" : undefined}>
            <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} /> {likes} {liked ? "Liked" : "Like"}
          </Button>
          <Button variant={bookmarked ? "default" : "outline"} onClick={toggleBookmark}>
            <Bookmark className="h-4 w-4" /> {bookmarked ? "Saved" : "Save"}
          </Button>
          <ReportLessonButton postId={post.id} />
        </div>

        {/* Comments */}
        <section id="comments" className="mt-12 scroll-mt-20">
          <h3 className="font-serif text-2xl">Discussion ({comments.length})</h3>
          {user ? (
            <div className="mt-4 space-y-2">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value.slice(0, COMMENT_LIMIT))}
                placeholder="Share your thoughts…"
                rows={3}
                maxLength={COMMENT_LIMIT}
              />
              <div className="flex items-center justify-between">
                <span className={`text-xs ${newComment.length >= COMMENT_LIMIT - 50 ? "text-destructive" : "text-muted-foreground"}`}>
                  {newComment.length}/{COMMENT_LIMIT}
                </span>
                <Button onClick={async () => { await submitComment(newComment, null); setNewComment(""); }} disabled={posting || !newComment.trim()}>
                  <Send className="h-4 w-4" /> Post
                </Button>
              </div>
            </div>
          ) : (
            <p className="mt-4 rounded-md border bg-muted/40 p-4 text-sm text-muted-foreground">
              <Link to="/login" className="font-medium text-primary underline">Sign in</Link> to join the discussion.
            </p>
          )}
          <ul className="mt-8 space-y-6">
            {topComments.map((c) => (
              <li key={c.id} className="border-b pb-6">
                <CommentItem
                  c={c}
                  isAdmin={adminIds.has(c.author_user_id)}
                  onLike={() => toggleCommentLike(c)}
                  canReply={!!user}
                  onReply={() => { setReplyTo(replyTo === c.id ? null : c.id); setReplyBody(""); }}
                />
                {/* Replies */}
                <ul className="mt-4 ml-8 space-y-4 border-l pl-4">
                  {(repliesByParent.get(c.id) ?? []).map((r) => (
                    <li key={r.id}>
                      <CommentItem
                        c={r}
                        isAdmin={adminIds.has(r.author_user_id)}
                        onLike={() => toggleCommentLike(r)}
                        canReply={false}
                      />
                    </li>
                  ))}
                </ul>
                {replyTo === c.id && user && (
                  <div className="mt-3 ml-8 space-y-2 border-l pl-4">
                    <Textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value.slice(0, COMMENT_LIMIT))}
                      placeholder={`Reply to ${displayName(c.author, false)}…`}
                      rows={2}
                      maxLength={COMMENT_LIMIT}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{replyBody.length}/{COMMENT_LIMIT}</span>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={() => setReplyTo(null)}>Cancel</Button>
                        <Button size="sm" disabled={posting || !replyBody.trim()} onClick={async () => { await submitComment(replyBody, c.id); setReplyBody(""); setReplyTo(null); }}>
                          <Send className="h-3.5 w-3.5" /> Reply
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      </article>
      <SiteFooter />
    </div>
  );
}

function CommentItem({
  c, isAdmin, onLike, canReply, onReply,
}: {
  c: Comment;
  isAdmin: boolean;
  onLike: () => void;
  canReply: boolean;
  onReply?: () => void;
}) {
  const name = displayName(c.author, false);
  return (
    <div>
      <div className="flex items-center gap-3">
        <Avatar className="h-8 w-8">
          <AvatarImage src={c.author?.avatar_url || undefined} alt={name} />
          <AvatarFallback className="bg-primary/10 text-xs text-primary">{initialsFor(name)}</AvatarFallback>
        </Avatar>
        <div className="flex-1">
          {isAdmin && (
            <p className="text-[10px] font-semibold uppercase tracking-wider text-primary inline-flex items-center gap-1">
              <Shield className="h-3 w-3" /> Admin
            </p>
          )}
          <p className="text-sm font-medium">{name}</p>
          <p className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleString()}</p>
        </div>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm">{c.body}</p>
      <div className="mt-2 flex items-center gap-3 text-xs">
        <button onClick={onLike} className={`inline-flex items-center gap-1 hover:text-primary ${c.liked ? "text-primary" : "text-muted-foreground"}`}>
          <Heart className={`h-3.5 w-3.5 ${c.liked ? "fill-current" : ""}`} /> {c.likes > 0 ? c.likes : "Like"}
        </button>
        {canReply && onReply && (
          <button onClick={onReply} className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
            <Reply className="h-3.5 w-3.5" /> Reply
          </button>
        )}
      </div>
    </div>
  );
}

function Section({ id, label, body, media, children }: { id?: string; label: string; body: string; media?: MediaItem[]; children?: React.ReactNode }) {
  const hasBody = !!body?.trim();
  const hasMedia = !!media?.length;
  if (!hasBody && !hasMedia && !children) return null;
  return (
    <section id={id} className={id ? "scroll-mt-20" : undefined}>
      <h2 className="font-serif text-2xl text-primary">{label}</h2>
      {hasBody && <div className="mt-3 whitespace-pre-wrap">{body}</div>}
      {hasMedia && <MediaRender items={media!} />}
      {children}
    </section>
  );
}
