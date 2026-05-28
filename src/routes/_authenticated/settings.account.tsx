import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, KeyRound, LogOut, AtSign, Lock } from "lucide-react";
import { toast } from "sonner";
import { updateUsername } from "@/lib/account.functions";

export const Route = createFileRoute("/_authenticated/settings/account")({
  component: AccountSettings,
});

function AccountSettings() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const updateUsernameFn = useServerFn(updateUsername);

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

  const [username, setUsername] = useState("");
  const [initialUsername, setInitialUsername] = useState("");
  const [editsUsed, setEditsUsed] = useState<number>(0);
  const [unameBusy, setUnameBusy] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username,username_edits_used")
        .eq("user_id", user.id)
        .maybeSingle();
      setUsername(data?.username ?? "");
      setInitialUsername(data?.username ?? "");
      setEditsUsed(data?.username_edits_used ?? 0);
      setLoadingProfile(false);
    })();
  }, [user]);

  const saveUsername = async () => {
    if (!username.trim()) return toast.error("Username cannot be empty");
    if (username === initialUsername) return;
    setUnameBusy(true);
    try {
      await updateUsernameFn({ data: { username: username.trim() } });
      toast.success("Username updated");
      setInitialUsername(username.trim());
      setEditsUsed((n) => n + 1);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to update");
      setUsername(initialUsername);
    } finally {
      setUnameBusy(false);
    }
  };

  const changePassword = async () => {
    if (pw.length < 8) return toast.error("Min 8 characters");
    if (pw !== pw2) return toast.error("Passwords don't match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    setPw(""); setPw2("");
  };

  const signOutAll = async () => {
    await supabase.auth.signOut({ scope: "global" });
    nav({ to: "/login" });
  };

  const locked = editsUsed >= 1;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-3 p-6">
          <h2 className="font-serif text-xl">Account email</h2>
          <p className="text-sm text-muted-foreground">This is the email you use to sign in.</p>
          <Input value={user?.email ?? ""} disabled className="font-mono text-sm" />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-serif text-xl">Username</h2>
              <p className="text-sm text-muted-foreground">
                Shown on your lessons and comments. {locked
                  ? "You've already used your one free change — contact support if you need another."
                  : "You can change this once. After that, you'll need to contact support."}
              </p>
            </div>
            {locked && <Lock className="h-4 w-4 text-muted-foreground" />}
          </div>
          <div className="relative">
            <AtSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ""))}
              placeholder="your-name"
              disabled={locked || loadingProfile || unameBusy}
              className="pl-9"
              maxLength={30}
            />
          </div>
          <p className="text-xs text-muted-foreground">3–30 characters · letters, numbers, dot, underscore, dash</p>
          <div className="flex items-center justify-between gap-2">
            <a href="mailto:support@weshareeduteach.name.ng" className="text-xs text-primary hover:underline">
              {locked ? "Request another change" : "Need help?"}
            </a>
            <Button onClick={saveUsername} disabled={locked || unameBusy || loadingProfile || username === initialUsername}>
              {unameBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Save username
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-6">
          <h2 className="font-serif text-xl">Change password</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">New password</Label>
              <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Confirm</Label>
              <Input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={changePassword} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Update password
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-6">
          <h2 className="font-serif text-xl">Sessions</h2>
          <p className="text-sm text-muted-foreground">Sign out of every device using your account.</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={async () => { await signOut(); nav({ to: "/" }); }}>
              <LogOut className="h-4 w-4" /> Sign out
            </Button>
            <Button variant="destructive" onClick={signOutAll}>
              <LogOut className="h-4 w-4" /> Sign out everywhere
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
