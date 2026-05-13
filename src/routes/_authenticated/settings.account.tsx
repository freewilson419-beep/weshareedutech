import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, KeyRound, LogOut } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings/account")({
  component: AccountSettings,
});

function AccountSettings() {
  const { user, signOut } = useAuth();
  const nav = useNavigate();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);

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
