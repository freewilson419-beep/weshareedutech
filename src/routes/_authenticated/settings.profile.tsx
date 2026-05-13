import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AvatarUpload } from "@/components/avatar-upload";
import { authorName } from "@/lib/author-display";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";

export const Route = createFileRoute("/_authenticated/settings/profile")({
  component: ProfileSettings,
});

interface Form {
  title: string;
  surname: string;
  othernames: string;
  username: string;
  department: string;
  affiliation: string;
  phone_number: string;
  whatsapp_number: string;
  avatar_url: string;
}

const empty: Form = {
  title: "", surname: "", othernames: "", username: "",
  department: "", affiliation: "", phone_number: "", whatsapp_number: "", avatar_url: "",
};

function ProfileSettings() {
  const { user } = useAuth();
  const [form, setForm] = useState<Form>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("title,surname,othernames,username,department,affiliation,phone_number,whatsapp_number,avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) setForm({ ...empty, ...data });
      setLoading(false);
    })();
  }, [user]);

  const u = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update(form).eq("user_id", user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Profile saved");
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const display = authorName({ ...form }, false);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <AvatarUpload
            userId={user!.id}
            url={form.avatar_url}
            name={display}
            onChange={(url) => setForm((f) => ({ ...f, avatar_url: url }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-5 p-6">
          <h2 className="font-serif text-xl">Personal info</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Title"><Input value={form.title} onChange={u("title")} placeholder="Dr." /></Field>
            <Field label="Username"><Input value={form.username} onChange={u("username")} placeholder="janedoe" /></Field>
            <Field label="Surname"><Input value={form.surname} onChange={u("surname")} /></Field>
            <Field label="Other names"><Input value={form.othernames} onChange={u("othernames")} /></Field>
            <Field label="Department"><Input value={form.department} onChange={u("department")} /></Field>
            <Field label="Affiliation"><Input value={form.affiliation} onChange={u("affiliation")} placeholder="University of …" /></Field>
            <Field label="Phone"><Input value={form.phone_number} onChange={u("phone_number")} /></Field>
            <Field label="WhatsApp"><Input value={form.whatsapp_number} onChange={u("whatsapp_number")} /></Field>
          </div>
          <div className="flex justify-end">
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs uppercase tracking-wider text-muted-foreground">{label}</Label>{children}</div>;
}
