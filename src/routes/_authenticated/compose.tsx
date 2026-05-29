import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ImagePlus, Loader2, Save, Send, X, EyeOff, Link as LinkIcon, Copy } from "lucide-react";
import { MediaManager, type MediaItem } from "@/components/media-manager";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/_authenticated/compose")({
  validateSearch: (s: Record<string, unknown>) => ({ id: (s.id as string) || undefined }),
  component: Compose,
});

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}

const SECTIONS = ["intro", "body", "conclusion", "reflection", "learn_to_teach"] as const;
type SectionKey = typeof SECTIONS[number];

function Compose() {
  const { user } = useAuth();
  const { id } = Route.useSearch();
  const nav = useNavigate();
  const [loading, setLoading] = useState(!!id);
  const [postId, setPostId] = useState<string | undefined>(id);
  const [coverUploading, setCoverUploading] = useState(false);
  const coverRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    title: "", excerpt: "", cover_image_url: "", tags: "",
    goal: "", intro_slide: "", body_slide: "", conclusion_slide: "",
    reflection: "", learn_to_teach: "", quiz_url: "",
  });
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isUnlisted, setIsUnlisted] = useState(false);
  const [publishedSlug, setPublishedSlug] = useState<string | null>(null);
  const [media, setMedia] = useState<Record<SectionKey, MediaItem[]>>({
    intro: [], body: [], conclusion: [], reflection: [], learn_to_teach: [],
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      // Hydrate from existing post if editing
      if (id) {
        const { data } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
        if (data) {
          setForm({
            title: data.title, excerpt: data.excerpt, cover_image_url: data.cover_image_url,
            tags: (data.tags ?? []).join(", "),
            goal: data.goal, intro_slide: data.intro_slide, body_slide: data.body_slide,
            conclusion_slide: data.conclusion_slide, reflection: data.reflection,
            learn_to_teach: data.learn_to_teach, quiz_url: data.quiz_url,
          });
          setIsAnonymous(!!data.is_anonymous);
          setIsUnlisted(!!data.is_unlisted);
          if (data.is_unlisted && data.published_at) setPublishedSlug(data.slug);
          const sm = (data.section_media ?? {}) as Partial<Record<SectionKey, MediaItem[]>>;
          setMedia({
            intro: sm.intro ?? [], body: sm.body ?? [], conclusion: sm.conclusion ?? [],
            reflection: sm.reflection ?? [], learn_to_teach: sm.learn_to_teach ?? [],
          });
        }
      } else {
        // New post — apply user's default-anonymous preference
        const { data: prof } = await supabase.from("profiles").select("default_anonymous").eq("user_id", user.id).maybeSingle();
        if (prof?.default_anonymous) setIsAnonymous(true);
      }
      setLoading(false);
    })();
  }, [id, user]);

  const u = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const uploadCover = async (file: File) => {
    if (!user) return;
    if (!file.type.startsWith("image/")) return toast.error("Pick an image file");
    if (file.size > 10 * 1024 * 1024) return toast.error("Max 10MB");
    setCoverUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/cover-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("post-media").upload(path, file, { contentType: file.type });
    if (error) { setCoverUploading(false); return toast.error(error.message); }
    const { data } = supabase.storage.from("post-media").getPublicUrl(path);
    setForm((f) => ({ ...f, cover_image_url: data.publicUrl }));
    setCoverUploading(false);
  };

  const buildPayload = () => {
    const wordCount = (form.intro_slide + " " + form.body_slide + " " + form.conclusion_slide).split(/\s+/).filter(Boolean).length;
    const read = Math.max(2, Math.ceil(wordCount / 200));
    return {
      author_user_id: user!.id,
      title: form.title.trim() || "Untitled",
      excerpt: form.excerpt.trim(),
      cover_image_url: form.cover_image_url.trim(),
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      goal: form.goal, intro_slide: form.intro_slide, body_slide: form.body_slide,
      conclusion_slide: form.conclusion_slide, reflection: form.reflection,
      learn_to_teach: form.learn_to_teach, quiz_url: form.quiz_url.trim(),
      read_time_minutes: read,
      section_media: media,
      is_anonymous: isAnonymous,
      is_unlisted: isUnlisted,
    };
  };

  const save = async (publish: boolean) => {
    if (!user) return;
    if (!form.title.trim()) return toast.error("Add a title first");
    const base = buildPayload();
    const slug = slugify(form.title) + "-" + Math.random().toString(36).slice(2, 7);
    const publishedAt = publish ? new Date().toISOString() : null;
    let savedSlug: string | undefined;
    if (postId) {
      const { data, error } = await supabase.from("posts").update({ ...base, ...(publish ? { published_at: publishedAt } : {}) }).eq("id", postId).select("slug").single();
      if (error) return toast.error(error.message);
      savedSlug = data?.slug;
    } else {
      const { data, error } = await supabase.from("posts").insert({ ...base, slug, published_at: publishedAt }).select("id,slug").single();
      if (error) return toast.error(error.message);
      setPostId(data.id);
      savedSlug = data.slug;
    }
    toast.success(publish ? (isUnlisted ? "Published as private link" : "Published!") : "Draft saved");
    if (publish) {
      if (isUnlisted && savedSlug) {
        setPublishedSlug(savedSlug);
      } else {
        nav({ to: "/dashboard" });
      }
    }
  };

  const shareUrl = publishedSlug ? `${typeof window !== "undefined" ? window.location.origin : ""}/p/${publishedSlug}` : "";

  if (loading) return <div className="flex justify-center py-24"><div className="h-6 w-6 animate-spin rounded-full border-b-2 border-primary" /></div>;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl">{postId ? "Edit lesson" : "New lesson"}</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => save(false)}><Save className="h-4 w-4" /> Save draft</Button>
          <Button onClick={() => save(true)}><Send className="h-4 w-4" /> Publish</Button>
        </div>
      </div>

      <Card><CardContent className="space-y-5 p-6">
        <Field label="Title"><Input value={form.title} onChange={u("title")} placeholder="Your lesson title" className="font-serif text-2xl" /></Field>
        <Field label="Excerpt (1–2 sentences shown on the feed)"><Textarea value={form.excerpt} onChange={u("excerpt")} rows={2} /></Field>

        <Field label="Cover image">
          <input
            ref={coverRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(f); e.target.value = ""; }}
          />
          {form.cover_image_url ? (
            <div className="relative overflow-hidden rounded-md border">
              <img src={form.cover_image_url} alt="" className="aspect-[16/9] w-full object-cover" />
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, cover_image_url: "" }))}
                className="absolute right-2 top-2 rounded-full bg-background/90 p-1.5 hover:bg-background"
                aria-label="Remove cover"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => coverRef.current?.click()}
              disabled={coverUploading}
              className="flex aspect-[16/9] w-full items-center justify-center rounded-md border border-dashed bg-muted/30 text-sm text-muted-foreground hover:bg-muted/50"
            >
              {coverUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><ImagePlus className="mr-2 h-5 w-5" /> Upload cover image</>}
            </button>
          )}
          <p className="mt-1 text-xs text-muted-foreground">PNG / JPG up to 10MB. The original quality is kept.</p>
        </Field>

        <Field label="Tags (comma separated)"><Input value={form.tags} onChange={u("tags")} placeholder="biology, ecosystems" /></Field>
      </CardContent></Card>

      <Card><CardContent className="space-y-6 p-6">
        <h2 className="font-serif text-xl">Lesson structure</h2>
        <Field label="Goal"><Textarea value={form.goal} onChange={u("goal")} rows={2} placeholder="What should the reader be able to do after?" /></Field>

        <SectionBlock label="Introduction" value={form.intro_slide} onText={u("intro_slide")} rows={4} userId={user!.id} media={media.intro} setMedia={(m) => setMedia((s) => ({ ...s, intro: m }))} />
        <SectionBlock label="Body" value={form.body_slide} onText={u("body_slide")} rows={8} userId={user!.id} media={media.body} setMedia={(m) => setMedia((s) => ({ ...s, body: m }))} />
        <SectionBlock label="Conclusion" value={form.conclusion_slide} onText={u("conclusion_slide")} rows={3} userId={user!.id} media={media.conclusion} setMedia={(m) => setMedia((s) => ({ ...s, conclusion: m }))} />
        <SectionBlock label="Reflection" value={form.reflection} onText={u("reflection")} rows={3} userId={user!.id} media={media.reflection} setMedia={(m) => setMedia((s) => ({ ...s, reflection: m }))} />
        <SectionBlock label="Learn to teach" value={form.learn_to_teach} onText={u("learn_to_teach")} rows={3} userId={user!.id} media={media.learn_to_teach} setMedia={(m) => setMedia((s) => ({ ...s, learn_to_teach: m }))} />
      </CardContent></Card>

      <Card><CardContent className="space-y-3 p-6">
        <Field label="External quiz URL (Google Form, Typeform, etc.)">
          <Input value={form.quiz_url} onChange={u("quiz_url")} placeholder="https://forms.gle/…" />
        </Field>
        <p className="text-xs text-muted-foreground">Optional. Readers will see a "Take the quiz" button that opens this link.</p>
      </CardContent></Card>

      <Card><CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label className="flex items-center gap-2 font-serif text-base">
              <EyeOff className="h-4 w-4" /> Publish anonymously
            </Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Hide your name from this lesson. Readers will see "Anonymous contributor".
            </p>
          </div>
          <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
        </div>
      </CardContent></Card>

      <Card><CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Label className="flex items-center gap-2 font-serif text-base">
              <LinkIcon className="h-4 w-4" /> Private (link only)
            </Label>
            <p className="mt-1 text-sm text-muted-foreground">
              Don't show this lesson on the public feed or sitemap. Only people you share the link with can read it.
            </p>
          </div>
          <Switch checked={isUnlisted} onCheckedChange={setIsUnlisted} />
        </div>
        {publishedSlug && isUnlisted && (
          <div className="mt-4 rounded-md border bg-muted/40 p-3">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Share this link</p>
            <div className="mt-2 flex items-center gap-2">
              <Input readOnly value={shareUrl} className="text-xs" />
              <Button
                size="sm"
                variant="outline"
                onClick={() => { navigator.clipboard.writeText(shareUrl); toast.success("Link copied"); }}
              >
                <Copy className="h-4 w-4" /> Copy
              </Button>
            </div>
          </div>
        )}
      </CardContent></Card>
    </div>
  );
}

function SectionBlock({
  label, value, onText, rows, userId, media, setMedia,
}: {
  label: string;
  value: string;
  onText: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  rows: number;
  userId: string;
  media: MediaItem[];
  setMedia: (m: MediaItem[]) => void;
}) {
  return (
    <div className="space-y-2 rounded-lg border bg-muted/20 p-4">
      <Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>
      <Textarea value={value} onChange={onText} rows={rows} className="bg-background" />
      <MediaManager userId={userId} items={media} onChange={setMedia} />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>{children}</div>;
}
