import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Save, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings/preferences")({
  component: Preferences,
});

function Preferences() {
  const { user } = useAuth();
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [defaultAnonymous, setDefaultAnonymous] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("interest_tags,default_anonymous")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setTags(data.interest_tags ?? []);
        setDefaultAnonymous(!!data.default_anonymous);
      }
      setLoading(false);
    })();
  }, [user]);

  const addTag = () => {
    const v = tagInput.trim().toLowerCase();
    if (!v || tags.includes(v) || tags.length >= 12) return;
    setTags([...tags, v]);
    setTagInput("");
  };

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ interest_tags: tags, default_anonymous: defaultAnonymous }).eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Preferences saved");
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <h2 className="font-serif text-xl">Your interests</h2>
            <p className="text-sm text-muted-foreground">We'll use these to personalize lessons on your dashboard.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((t) => (
              <Badge key={t} variant="secondary" className="gap-1 pr-1">
                {t}
                <button onClick={() => setTags(tags.filter((x) => x !== t))} className="rounded-full p-0.5 hover:bg-background">
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {tags.length === 0 && <p className="text-sm text-muted-foreground">No interests yet.</p>}
          </div>
          <div className="flex gap-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
              placeholder="biology, ai, history…"
            />
            <Button type="button" variant="outline" onClick={addTag}>Add</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Label className="font-serif text-base">Publish anonymously by default</Label>
              <p className="mt-1 text-sm text-muted-foreground">
                When on, new lessons hide your name. You can still flip the toggle on each lesson.
              </p>
            </div>
            <Switch checked={defaultAnonymous} onCheckedChange={setDefaultAnonymous} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save preferences
        </Button>
      </div>
    </div>
  );
}
