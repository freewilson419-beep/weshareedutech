import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { toast } from "sonner";
import { AuthShell } from "./login";
import { GoogleSignInButton } from "@/components/google-sign-in-button";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Get started — WeShare EduTech" },
      { name: "description", content: "Create a free WeShare EduTech account to publish structured lessons, join discussions, and bookmark what you love." },
      { property: "og:title", content: "Get started — WeShare EduTech" },
      { property: "og:description", content: "Create a free WeShare EduTech account to publish lessons and engage with the community." },
      { property: "og:url", content: "https://weshareeduteach.name.ng/signup" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://weshareeduteach.name.ng/signup" }],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [step, setStep] = useState<"form" | "verify">("form");
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [form, setForm] = useState({
    title: "Mr",
    surname: "",
    othernames: "",
    username: "",
    phone_number: "",
    whatsapp_number: "",
    email: "",
    password: "",
    confirm: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    if (session) navigate({ to: "/dashboard" });
  }, [session, navigate]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) return toast.error("Password must be at least 6 characters");
    if (form.password !== form.confirm) return toast.error("Passwords don't match");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: {
        data: {
          title: form.title,
          surname: form.surname,
          othernames: form.othernames,
          username: form.username,
        },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("We sent a verification code to your email");
    setStep("verify");
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) return toast.error("Enter the 6-digit code");
    setLoading(true);
    const response = await fetch("/api/signup/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.email, code }),
    });
    const result = await response.json();
    if (!response.ok || !result.user || !result.session) {
      setLoading(false);
      return toast.error(result.error || "Invalid code");
    }
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token,
    });
    if (sessionError) {
      setLoading(false);
      return toast.error(sessionError.message);
    }
    const { error: pErr } = await supabase
      .from("profiles")
      .update({
        title: form.title,
        surname: form.surname,
        othernames: form.othernames,
        username: form.username,
        phone_number: form.phone_number,
        whatsapp_number: form.whatsapp_number,
        is_complete: true,
      })
      .eq("user_id", result.user.id);
    setLoading(false);
    if (pErr) return toast.error(pErr.message);
    toast.success("Welcome to WeShare EduTech");
    navigate({ to: "/dashboard" });
  };

  if (step === "verify") {
    return (
      <AuthShell title="Verify your email" subtitle={`Enter the 6-digit code sent to ${form.email}`}>
        <form onSubmit={handleVerify} className="space-y-6">
          <div className="flex justify-center">
            <InputOTP maxLength={6} value={code} onChange={setCode}>
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => <InputOTPSlot key={i} index={i} />)}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>{loading ? "Verifying…" : "Verify & continue"}</Button>
          <button
            type="button"
            className="mx-auto block text-xs text-muted-foreground hover:text-foreground"
            onClick={async () => {
              const { error } = await supabase.auth.resend({ type: "signup", email: form.email });
              if (error) toast.error(error.message); else toast.success("Code re-sent");
            }}
          >
            Didn't get it? Resend code
          </button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Get started" subtitle="Create your WeShare EduTech account">
      <GoogleSignInButton label="Sign up with Google" />
      <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> OR <span className="h-px flex-1 bg-border" />
      </div>
      <form onSubmit={handleCreate} className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Select value={form.title} onValueChange={(v) => set("title", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["Mr", "Mrs", "Ms", "Dr", "Prof"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1.5">
            <Label>Surname</Label>
            <Input required value={form.surname} onChange={(e) => set("surname", e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Other names</Label>
          <Input required value={form.othernames} onChange={(e) => set("othernames", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Username</Label>
          <Input required value={form.username} onChange={(e) => set("username", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input required value={form.phone_number} onChange={(e) => set("phone_number", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>WhatsApp</Label>
            <Input required value={form.whatsapp_number} onChange={(e) => set("whatsapp_number", e.target.value)} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" required value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Password</Label>
            <Input type="password" required minLength={6} value={form.password} onChange={(e) => set("password", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Confirm</Label>
            <Input type="password" required minLength={6} value={form.confirm} onChange={(e) => set("confirm", e.target.value)} />
          </div>
        </div>
        <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating…" : "Create account"}</Button>
        <p className="text-center text-sm text-muted-foreground">Already have one? <Link to="/login" className="text-primary hover:underline">Sign in</Link></p>
      </form>
    </AuthShell>
  );
}
