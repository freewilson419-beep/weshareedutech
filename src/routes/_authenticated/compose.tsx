import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Save, Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/compose")({
  validateSearch: (s: Record<string, unknown>) => ({ id: (s.id as string) || undefined }),
  component: Compose,
});

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
}

function Compose() {
  const { user } = useAuth();
  const { id } = Route.useSearch();
  const nav = useNavigate();
  const [loading, setLoading] = useState(!!id);
  const [postId, setPostId] = useState<string | undefined>(id);
  const [form, setForm] = useState({
    title: "", excerpt: "", cover_image_url: "", tags: "",
    goal: "", intro_slide: "", body_slide: "", conclusion_slide: "",
    reflection: "", learn_to_teach: "", quiz_url: "",
  });

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase.from("posts").select("*").eq("id", id).maybeSingle();
      if (data) {
        setForm({
          title: data.title, excerpt: data.excerpt, cover_image_url: data.cover_image_url,
          tags: (data.tags ?? []).join(", "),
          goal: data.goal, intro_slide: data.intro_slide, body_slide: data.body_slide,
          conclusion_slide: data.conclusion_slide, reflection: data.reflection,
          learn_to_teach: data.learn_to_teach, quiz_url: data.quiz_url,
        });
      }
      setLoading(false);
    })();
  }, [id]);

  const u = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

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
    };
  };

  const save = async (publish: boolean) => {
    if (!user) return;
    if (!form.title.trim()) return toast.error("Add a title first");
    const base = buildPayload();
    const slug = slugify(form.title) + "-" + Math.random().toString(36).slice(2, 7);
    if (postId) {
      const update: Record<string, unknown> = { ...base };
      if (publish) update.published_at = new Date().toISOString();
      const { error } = await supabase.from("posts").update(update).eq("id", postId);
      if (error) return toast.error(error.message);
    } else {
      const insert: Record<string, unknown> = { ...base, slug };
      if (publish) insert.published_at = new Date().toISOString();
      const { data, error } = await supabase.from("posts").insert(insert).select("id,slug").single();
      if (error) return toast.error(error.message);
      setPostId(data.id);
    }
    toast.success(publish ? "Published!" : "Draft saved");
    if (publish) nav({ to: "/dashboard" });
  };

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
        <Field label="Cover image URL (optional)"><Input value={form.cover_image_url} onChange={u("cover_image_url")} placeholder="https://…" /></Field>
        <Field label="Tags (comma separated)"><Input value={form.tags} onChange={u("tags")} placeholder="biology, ecosystems" /></Field>
      </CardContent></Card>

      <Card><CardContent className="space-y-5 p-6">
        <h2 className="font-serif text-xl">Lesson structure</h2>
        <Field label="Goal"><Textarea value={form.goal} onChange={u("goal")} rows={2} placeholder="What should the reader be able to do after?" /></Field>
        <Field label="Introduction"><Textarea value={form.intro_slide} onChange={u("intro_slide")} rows={4} /></Field>
        <Field label="Body"><Textarea value={form.body_slide} onChange={u("body_slide")} rows={8} /></Field>
        <Field label="Conclusion"><Textarea value={form.conclusion_slide} onChange={u("conclusion_slide")} rows={3} /></Field>
        <Field label="Reflection"><Textarea value={form.reflection} onChange={u("reflection")} rows={3} placeholder="What should the reader sit with?" /></Field>
        <Field label="Learn to teach"><Textarea value={form.learn_to_teach} onChange={u("learn_to_teach")} rows={3} placeholder="A note on how to teach this back to someone else." /></Field>
      </CardContent></Card>

      <Card><CardContent className="space-y-3 p-6">
        <Field label="External quiz URL (Google Form, Typeform, etc.)">
          <Input value={form.quiz_url} onChange={u("quiz_url")} placeholder="https://forms.gle/…" />
        </Field>
        <p className="text-xs text-muted-foreground">Optional. Readers will see a "Take the quiz" button that opens this link.</p>
      </CardContent></Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>{children}</div>;
}
