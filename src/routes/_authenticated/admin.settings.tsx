import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Save, Wrench, Mail, Tag, EyeOff, Sparkles, Bell } from "lucide-react";
import { adminGetSettings, adminSaveSetting } from "@/lib/admin.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const get = useServerFn(adminGetSettings);
  const save = useServerFn(adminSaveSetting);
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["admin-settings"], queryFn: () => get() });

  const [maint, setMaint] = useState(false);
  const [maintMsg, setMaintMsg] = useState("");
  const [contact, setContact] = useState("");
  const [defaultAnon, setDefaultAnon] = useState(false);
  const [tags, setTags] = useState("");
  const [aiOn, setAiOn] = useState(true);
  const [emailDefault, setEmailDefault] = useState(true);

  useEffect(() => {
    if (!data) return;
    setMaint(data.maintenance_on === "true");
    setMaintMsg(data.maintenance_message ?? "");
    setContact(data.contact_email ?? "");
    setDefaultAnon(data.default_anonymous_global === "true");
    setTags(data.featured_tags ?? "");
    setAiOn((data.ai_grading_enabled ?? "true") === "true");
    setEmailDefault((data.announcement_send_email_default ?? "true") === "true");
  }, [data]);

  const persist = async (key: string, value: string) => {
    try {
      await save({ data: { key, value } });
      toast.success("Saved");
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
    } catch (e: any) { toast.error(e.message); }
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 font-medium"><Wrench className="h-4 w-4 text-primary" /> Maintenance Mode</h3>
              <p className="text-sm text-muted-foreground">When ON, a banner is shown to all users on every page.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{maint ? "ON" : "OFF"}</span>
              <Switch checked={maint} onCheckedChange={(v) => { setMaint(v); persist("maintenance_on", v ? "true" : "false"); }} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Custom message shown on the banner</Label>
            <Textarea value={maintMsg} onChange={(e) => setMaintMsg(e.target.value)} placeholder="The platform is currently under maintenance. Please check back soon." rows={2} />
          </div>
          <Button size="sm" variant="outline" onClick={() => persist("maintenance_message", maintMsg)}>
            <Save className="h-4 w-4" /> Save Message
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div>
            <h3 className="flex items-center gap-2 font-medium"><Mail className="h-4 w-4 text-primary" /> Platform Contact Email</h3>
            <p className="text-sm text-muted-foreground">Shown in the homepage footer so users know who to reach for support.</p>
          </div>
          <div className="flex gap-2">
            <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="support@example.com" />
            <Button onClick={() => persist("contact_email", contact)}><Save className="h-4 w-4" /> Save</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 font-medium"><EyeOff className="h-4 w-4 text-primary" /> Default Anonymous Publishing</h3>
              <p className="text-sm text-muted-foreground">When ON, new lessons default to anonymous unless authors opt in to attribution.</p>
            </div>
            <Switch checked={defaultAnon} onCheckedChange={(v) => { setDefaultAnon(v); persist("default_anonymous_global", v ? "true" : "false"); }} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div>
            <h3 className="flex items-center gap-2 font-medium"><Tag className="h-4 w-4 text-primary" /> Featured Tags</h3>
            <p className="text-sm text-muted-foreground">Comma-separated tags to feature on the landing page.</p>
          </div>
          <div className="flex gap-2">
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="mathematics, biology, pedagogy" />
            <Button onClick={() => persist("featured_tags", tags)}><Save className="h-4 w-4" /> Save</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
