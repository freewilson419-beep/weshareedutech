import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Loader2, Save, FileText } from "lucide-react";
import { toast } from "sonner";
import { adminListLegalDocs, adminUpdateLegalDoc } from "@/lib/legal.functions";

export const Route = createFileRoute("/_authenticated/admin/legal")({
  component: AdminLegal,
});

function AdminLegal() {
  const list = useServerFn(adminListLegalDocs);
  const update = useServerFn(adminUpdateLegalDoc);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-legal"], queryFn: () => list() });

  if (isLoading || !data) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 font-serif text-xl"><FileText className="h-5 w-5 text-primary" /> Legal Pages</h2>
        <p className="text-sm text-muted-foreground">Edit Terms, Privacy, Cookies, and Acceptable Use. Markdown supported.</p>
      </div>
      <Tabs defaultValue={data[0]?.slug ?? "terms"}>
        <TabsList className="flex-wrap">
          {data.map((d: any) => <TabsTrigger key={d.slug} value={d.slug} className="capitalize">{d.slug}</TabsTrigger>)}
        </TabsList>
        {data.map((d: any) => (
          <TabsContent key={d.slug} value={d.slug}>
            <DocEditor doc={d} onSave={async (title, body) => {
              await update({ data: { slug: d.slug, title, body } });
              toast.success("Saved");
              qc.invalidateQueries({ queryKey: ["admin-legal"] });
            }} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function DocEditor({ doc, onSave }: { doc: any; onSave: (t: string, b: string) => Promise<void> }) {
  const [title, setTitle] = useState(doc.title);
  const [body, setBody] = useState(doc.body);
  const [busy, setBusy] = useState(false);

  useEffect(() => { setTitle(doc.title); setBody(doc.body); }, [doc.id]);

  const save = async () => {
    setBusy(true);
    try { await onSave(title, body); } catch (e: any) { toast.error(e?.message || "Save failed"); }
    setBusy(false);
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={24} className="font-mono text-sm" />
        <div className="flex justify-end">
          <Button onClick={save} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
