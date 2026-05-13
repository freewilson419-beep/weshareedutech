import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AvatarUpload } from "@/components/avatar-upload";
import { authorName } from "@/lib/author-display";
import { Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings/profile")({
  component: ProfileSettings,
});

interface Profile {
  title: string;
  surname: string;
  othernames: string;
  username: string;
  department: string;
  affiliation: string;
  avatar_url: string;
}

function ProfileSettings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("title,surname,othernames,username,department,affiliation,avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      setProfile(data as Profile);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  const display = authorName(profile, false);

  const setAvatar = async (url: string) => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({ avatar_url: url }).eq("user_id", user.id);
    if (error) return toast.error(error.message);
    setProfile((p) => (p ? { ...p, avatar_url: url } : p));
    toast.success("Profile picture updated");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <AvatarUpload
            userId={user!.id}
            url={profile?.avatar_url ?? ""}
            name={display}
            onChange={setAvatar}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <div>
            <h2 className="font-serif text-xl">Your details</h2>
            <p className="text-sm text-muted-foreground">
              Collected during registration — this is what others will see on your lessons.
            </p>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Display name" value={display} />
            <Field label="Username" value={profile?.username || "—"} />
            <Field label="Department" value={profile?.department || "—"} />
            <Field label="Affiliation" value={profile?.affiliation || "—"} />
          </dl>
          <p className="text-xs text-muted-foreground">
            Need to fix something? <a href="mailto:support@weshareeduteach.name.ng" className="inline-flex items-center gap-1 text-primary hover:underline">Contact support <ExternalLink className="h-3 w-3" /></a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-sm font-medium">{value}</dd>
    </div>
  );
}
