import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, HelpCircle, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminListFaqs, adminCreateFaq, adminUpdateFaq, adminDeleteFaq } from "@/lib/faq.functions";

export const Route = createFileRoute("/_authenticated/admin/faqs")({
  component: AdminFaqs,
});

const empty = { category: "General", question: "", answer: "", sort_order: 0, is_published: true };

function AdminFaqs() {
  const list = useServerFn(adminListFaqs);
  const create = useServerFn(adminCreateFaq);
  const update = useServerFn(adminUpdateFaq);
  const del = useServerFn(adminDeleteFaq);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-faqs"], queryFn: () => list() });

  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState<any>(null);
  const [form, setForm] = useState(empty);

  const openNew = () => { setEdit(null); setForm(empty); setOpen(true); };
  const openEdit = (f: any) => { setEdit(f); setForm({ category: f.category, question: f.question, answer: f.answer, sort_order: f.sort_order, is_published: f.is_published }); setOpen(true); };

  const save = async () => {
    try {
      if (edit) await update({ data: { id: edit.id, ...form } });
      else await create({ data: form });
      toast.success("Saved");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["admin-faqs"] });
    } catch (e: any) { toast.error(e?.message || "Save failed"); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this FAQ?")) return;
    await del({ data: { id } });
    toast.success("Deleted");
    qc.invalidateQueries({ queryKey: ["admin-faqs"] });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-serif text-xl"><HelpCircle className="h-5 w-5 text-primary" /> FAQs</h2>
          <p className="text-sm text-muted-foreground">Manage Help Center questions and answers.</p>
        </div>
        <Button onClick={openNew}><Plus className="h-4 w-4" /> New FAQ</Button>
      </div>

      {isLoading || !data ? (
        <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>
      ) : (
        <div className="space-y-2">
          {data.map((f: any) => (
            <Card key={f.id}>
              <CardContent className="flex items-start justify-between gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-muted-foreground">{f.category} · #{f.sort_order} {!f.is_published && "· hidden"}</div>
                  <div className="mt-0.5 truncate text-sm font-medium">{f.question}</div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEdit(f)}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(f.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{edit ? "Edit FAQ" : "New FAQ"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="Category" />
            <Input value={form.question} onChange={(e) => setForm({ ...form, question: e.target.value })} placeholder="Question" />
            <Textarea value={form.answer} onChange={(e) => setForm({ ...form, answer: e.target.value })} placeholder="Answer" rows={6} />
            <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) || 0 })} placeholder="Sort order" />
            <div className="flex items-center gap-2">
              <Switch checked={form.is_published} onCheckedChange={(v) => setForm({ ...form, is_published: v })} />
              <Label>Published</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
