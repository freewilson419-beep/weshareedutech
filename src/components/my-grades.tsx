import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, ArrowRight, Sparkles } from "lucide-react";
import { getMyGrades } from "@/lib/grading.functions";

interface Grade {
  id: string;
  post_id: string;
  clarity_score: number | null;
  accuracy_score: number | null;
  completeness_score: number | null;
  total_score: number | null;
  ai_feedback: string;
  released_at: string;
  post: { id: string; title: string; slug: string; cover_image_url: string } | null;
}

function tone(total: number) {
  if (total >= 25) return { label: "Excellent", color: "bg-emerald-100 text-emerald-700" };
  if (total >= 20) return { label: "Strong", color: "bg-sky-100 text-sky-700" };
  if (total >= 14) return { label: "Solid", color: "bg-amber-100 text-amber-700" };
  return { label: "Keep going", color: "bg-rose-100 text-rose-700" };
}

export function MyGrades() {
  const fetchFn = useServerFn(getMyGrades);
  const { data, isLoading } = useQuery<Grade[]>({ queryKey: ["my-grades"], queryFn: () => fetchFn() });
  const [openId, setOpenId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  if (isLoading || !data || data.length === 0) return null;
  const open = data.find((g) => g.id === openId) || null;
  const avg = Math.round(data.reduce((s, g) => s + (g.total_score ?? 0), 0) / data.length);
  const visible = showAll ? data : data.slice(0, 1);

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-primary">
            <Trophy className="mr-1 inline h-3 w-3" /> Learn-to-Teach scores
          </p>
          <h2 className="font-serif text-2xl md:text-3xl">Your graded lessons</h2>
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p className="font-serif text-2xl text-foreground">{avg}<span className="text-base text-muted-foreground">/30</span></p>
          <p>average · {data.length} graded</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((g) => {
          const t = tone(g.total_score ?? 0);
          return (
            <Card key={g.id} className="overflow-hidden">
              <button type="button" onClick={() => setOpenId(g.id)} className="block w-full text-left">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="line-clamp-2 font-serif text-base font-semibold">{g.post?.title ?? "Lesson"}</h3>
                    <Badge className={`shrink-0 ${t.color}`}>{t.label}</Badge>
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="font-serif text-3xl">{g.total_score ?? 0}</span>
                    <span className="text-sm text-muted-foreground">/ 30</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Clarity {g.clarity_score ?? 0} · Accuracy {g.accuracy_score ?? 0} · Completeness {g.completeness_score ?? 0}
                  </p>
                  <p className="mt-3 inline-flex items-center gap-1 text-xs text-primary">
                    See feedback <ArrowRight className="h-3 w-3" />
                  </p>
                </CardContent>
              </button>
            </Card>
          );
        })}
      </div>
      {data.length > 1 && (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => setShowAll((v) => !v)}>
            {showAll ? "Show less" : `View all (${data.length})`} <ArrowRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      )}

      <Dialog open={!!open} onOpenChange={(v) => { if (!v) setOpenId(null); }}>
        <DialogContent className="max-w-lg">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="font-serif">{open.post?.title ?? "Your score"}</DialogTitle>
                <DialogDescription>
                  Released {new Date(open.released_at).toLocaleString()}
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-lg bg-muted/40 p-4">
                <div className="flex items-baseline gap-2">
                  <span className="font-serif text-5xl">{open.total_score ?? 0}</span>
                  <span className="text-muted-foreground">/ 30</span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-md bg-background p-2">
                    <p className="font-serif text-xl">{open.clarity_score ?? 0}</p>
                    <p className="text-muted-foreground">Clarity</p>
                  </div>
                  <div className="rounded-md bg-background p-2">
                    <p className="font-serif text-xl">{open.accuracy_score ?? 0}</p>
                    <p className="text-muted-foreground">Accuracy</p>
                  </div>
                  <div className="rounded-md bg-background p-2">
                    <p className="font-serif text-xl">{open.completeness_score ?? 0}</p>
                    <p className="text-muted-foreground">Completeness</p>
                  </div>
                </div>
              </div>
              {open.ai_feedback && (
                <div>
                  <p className="mb-1 inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-primary">
                    <Sparkles className="h-3 w-3" /> Feedback
                  </p>
                  <p className="whitespace-pre-wrap text-sm">{open.ai_feedback}</p>
                </div>
              )}
              {open.post && (
                <Link to="/p/$slug" params={{ slug: open.post.slug }}>
                  <Button variant="outline" className="w-full">Open lesson</Button>
                </Link>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
