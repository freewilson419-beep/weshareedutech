import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AuthShell } from "./login";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ title: "Reset password — WeShare EduTech" }] }),
  component: ResetPage,
});

function ResetPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const isRecovery = typeof window !== "undefined" && window.location.hash.includes("type=recovery");

  const sendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Check your email for the reset link.");
  };

  const updatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) toast.error(error.message);
    else toast.success("Password updated. You can now sign in.");
  };

  return (
    <AuthShell
      title={isRecovery ? "Set a new password" : "Forgot your password?"}
      subtitle={isRecovery ? "Choose a new password to finish" : "We'll email you a reset link"}
    >
      {isRecovery ? (
        <form onSubmit={updatePassword} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="np">New password</Label><Input id="np" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} /></div>
          <Button type="submit" className="w-full" disabled={loading}>Update password</Button>
        </form>
      ) : (
        <form onSubmit={sendLink} className="space-y-4">
          <div className="space-y-2"><Label htmlFor="re">Email</Label><Input id="re" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <Button type="submit" className="w-full" disabled={loading}>Send reset link</Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-muted-foreground"><Link to="/login" className="text-primary hover:underline">Back to sign in</Link></p>
    </AuthShell>
  );
}
